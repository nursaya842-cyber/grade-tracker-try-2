"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Modal,
  Button,
  Upload,
  Alert,
  Tag,
  Progress,
  Space,
  Segmented,
  App,
  Typography,
} from "antd";
import {
  CameraOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";

// ─── Types ─────────────────────────────────────────────────
interface StudentDescriptor {
  studentId: string;
  fullName: string;
  facePhotoUrl: string | null;
}

export interface FaceMatchResult {
  studentId: string;
  matched: boolean;
  confidence: number;
  method: "face_id";
}

interface Props {
  open: boolean;
  onClose: (results: FaceMatchResult[]) => void;
  students: StudentDescriptor[];
  signedUrls: Record<string, string>; // studentId -> signed URL
  threshold: number;
}

// ─── Descriptor cache helpers ──────────────────────────────
function getCachedDescriptor(studentId: string, photoUrl: string | null): Float32Array | null {
  if (!photoUrl) return null;
  try {
    const key = `face_desc:${studentId}:${photoUrl}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const arr = JSON.parse(cached) as number[];
      return new Float32Array(arr);
    }
  } catch { /* ignore */ }
  return null;
}

function setCachedDescriptor(studentId: string, photoUrl: string, descriptor: Float32Array) {
  try {
    const key = `face_desc:${studentId}:${photoUrl}`;
    localStorage.setItem(key, JSON.stringify(Array.from(descriptor)));
  } catch { /* ignore - quota exceeded etc */ }
}

// ─── Component ─────────────────────────────────────────────
export default function FaceIdModal({
  open,
  onClose,
  students,
  signedUrls,
  threshold,
}: Props) {
  const { message } = App.useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matcherReady, setMatcherReady] = useState(false);
  const [results, setResults] = useState<Map<string, FaceMatchResult>>(new Map());
  const [studentsWithoutPhoto, setStudentsWithoutPhoto] = useState<string[]>([]);
  const [buildProgress, setBuildProgress] = useState(0);

  const faceapiRef = useRef<typeof import("face-api.js") | null>(null);
  const matcherRef = useRef<InstanceType<typeof import("face-api.js").FaceMatcher> | null>(null);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;
    setLoading(true);
    try {
      const faceapi = await import("face-api.js");
      faceapiRef.current = faceapi;
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setModelsLoaded(true);
    } catch (err) {
      message.error("Ошибка загрузки моделей Face-ID");
      console.error(err);
    }
    setLoading(false);
  }, [modelsLoaded, message]);

  // Build FaceMatcher from student photos
  const buildMatcher = useCallback(async () => {
    const faceapi = faceapiRef.current;
    if (!faceapi) return;

    setLoading(true);
    setBuildProgress(0);

    const withPhoto = students.filter((s) => s.facePhotoUrl && signedUrls[s.studentId]);
    const noPhoto = students.filter((s) => !s.facePhotoUrl || !signedUrls[s.studentId]);
    setStudentsWithoutPhoto(noPhoto.map((s) => s.fullName));

    if (withPhoto.length === 0) {
      message.warning("Нет студентов с фотографиями для распознавания");
      setLoading(false);
      return;
    }

    const labeledDescriptors: InstanceType<typeof faceapi.LabeledFaceDescriptors>[] = [];

    for (let i = 0; i < withPhoto.length; i++) {
      const student = withPhoto[i];
      const url = signedUrls[student.studentId];
      setBuildProgress(Math.round(((i + 1) / withPhoto.length) * 100));

      try {
        // Check cache first
        const cached = getCachedDescriptor(student.studentId, student.facePhotoUrl);
        if (cached) {
          labeledDescriptors.push(
            new faceapi.LabeledFaceDescriptors(student.studentId, [cached])
          );
          continue;
        }

        // Download and extract descriptor
        const img = await faceapi.fetchImage(url);
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          labeledDescriptors.push(
            new faceapi.LabeledFaceDescriptors(student.studentId, [
              detection.descriptor,
            ])
          );
          setCachedDescriptor(student.studentId, student.facePhotoUrl!, detection.descriptor);
        }
      } catch (err) {
        console.warn(`Failed to process face for ${student.fullName}:`, err);
      }
    }

    if (labeledDescriptors.length > 0) {
      matcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, threshold);
      setMatcherReady(true);
    } else {
      message.warning("Не удалось извлечь дескрипторы ни одного студента");
    }

    setLoading(false);
  }, [students, signedUrls, threshold, message]);

  // Initialize on open
  useEffect(() => {
    if (open && !modelsLoaded) {
      loadModels().then(() => buildMatcher());
    } else if (open && modelsLoaded && !matcherReady) {
      buildMatcher();
    }
  }, [open, modelsLoaded, matcherReady, loadModels, buildMatcher]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopWebcam();
    }
  }, [open]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // Start scanning interval
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !faceapiRef.current || !matcherRef.current) return;

        const faceapi = faceapiRef.current;
        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();

        for (const d of detections) {
          const match = matcherRef.current.findBestMatch(d.descriptor);
          if (match.label !== "unknown") {
            setResults((prev) => {
              const next = new Map(prev);
              const existing = next.get(match.label);
              const confidence = 1 - match.distance;
              // Only update if better confidence or not yet matched
              if (!existing || confidence > existing.confidence) {
                next.set(match.label, {
                  studentId: match.label,
                  matched: true,
                  confidence,
                  method: "face_id",
                });
              }
              return next;
            });
          }
        }
      }, 1500);
    } catch (err) {
      message.error("Не удалось получить доступ к камере");
      console.error(err);
    }
  };

  const stopWebcam = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleUpload = async (file: File) => {
    const faceapi = faceapiRef.current;
    if (!faceapi || !matcherRef.current) return;

    setLoading(true);
    try {
      const img = await faceapi.bufferToImage(file);
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

      let matchCount = 0;
      for (const d of detections) {
        const match = matcherRef.current.findBestMatch(d.descriptor);
        if (match.label !== "unknown") {
          matchCount++;
          setResults((prev) => {
            const next = new Map(prev);
            next.set(match.label, {
              studentId: match.label,
              matched: true,
              confidence: 1 - match.distance,
              method: "face_id",
            });
            return next;
          });
        }
      }

      message.success(
        `Обнаружено лиц: ${detections.length}, распознано: ${matchCount}`
      );
    } catch (err) {
      message.error("Ошибка обработки изображения");
      console.error(err);
    }
    setLoading(false);
  };

  const handleClose = () => {
    stopWebcam();
    onClose(Array.from(results.values()));
  };

  const matchedCount = results.size;
  const totalWithPhoto = students.filter((s) => s.facePhotoUrl).length;

  return (
    <Modal
      title="Face-ID — Сканирование"
      open={open}
      onCancel={handleClose}
      width={700}
      footer={[
        <Button key="close" type="primary" onClick={handleClose}>
          Применить результаты ({matchedCount} распознано)
        </Button>,
      ]}
    >
      {studentsWithoutPhoto.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${studentsWithoutPhoto.length} студентов без фото — отметьте вручную`}
          description={studentsWithoutPhoto.join(", ")}
        />
      )}

      {!matcherReady && (
        <div style={{ textAlign: "center", padding: 24 }}>
          {loading ? (
            <>
              <LoadingOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <Typography.Text style={{ display: "block" }}>
                Загрузка моделей и дескрипторов...
              </Typography.Text>
              {buildProgress > 0 && (
                <Progress percent={buildProgress} size="small" style={{ maxWidth: 300, margin: "8px auto" }} />
              )}
            </>
          ) : (
            <Button onClick={() => loadModels().then(buildMatcher)}>
              Загрузить модели
            </Button>
          )}
        </div>
      )}

      {matcherReady && (
        <>
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v as "webcam" | "upload");
              if (v === "upload") stopWebcam();
            }}
            options={[
              { label: "Камера", value: "webcam", icon: <CameraOutlined /> },
              { label: "Загрузка фото", value: "upload", icon: <UploadOutlined /> },
            ]}
            style={{ marginBottom: 16 }}
          />

          {mode === "webcam" && (
            <div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 500,
                  margin: "0 auto 16px",
                  background: "#000",
                  borderRadius: 8,
                  overflow: "hidden",
                  aspectRatio: "4/3",
                }}
              >
                <video
                  ref={videoRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  muted
                  playsInline
                />
                {scanning && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                    }}
                  >
                    <Tag color="red" icon={<LoadingOutlined />}>
                      Сканирование...
                    </Tag>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                {!scanning ? (
                  <Button
                    type="primary"
                    icon={<CameraOutlined />}
                    onClick={startWebcam}
                    disabled={!matcherReady}
                  >
                    Начать сканирование
                  </Button>
                ) : (
                  <Button danger onClick={stopWebcam}>
                    Остановить
                  </Button>
                )}
              </div>
            </div>
          )}

          {mode === "upload" && (
            <Upload.Dragger
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                handleUpload(file);
                return false;
              }}
              disabled={loading}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              </p>
              <p>Перетащите фото или нажмите для выбора</p>
              <p style={{ color: "#888", fontSize: 12 }}>
                Групповое фото класса для массового распознавания
              </p>
            </Upload.Dragger>
          )}

          {/* Results */}
          {results.size > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>
                Распознано: {matchedCount} / {totalWithPhoto}
              </Typography.Text>
              <div style={{ marginTop: 8, maxHeight: 200, overflow: "auto" }}>
                {students.filter((s) => results.has(s.studentId)).map((s) => {
                  const r = results.get(s.studentId)!;
                  return (
                    <div key={s.studentId} style={{ padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <span>{s.fullName}</span>
                        <Tag color="blue">{Math.round(r.confidence * 100)}%</Tag>
                      </Space>
                    </div>
                  );
                })}
              </div>
              {students.filter((s) => s.facePhotoUrl && !results.has(s.studentId)).length > 0 && (
                <>
                  <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    Не распознано:
                  </Typography.Text>
                  <div style={{ maxHeight: 150, overflow: "auto" }}>
                    {students.filter((s) => s.facePhotoUrl && !results.has(s.studentId)).map((s) => (
                      <div key={s.studentId} style={{ padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                        <Space>
                          <CloseCircleOutlined style={{ color: "#f5222d" }} />
                          <span>{s.fullName}</span>
                        </Space>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
