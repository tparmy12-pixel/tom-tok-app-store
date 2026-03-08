import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  User,
  Users,
  Mic,
  Play,
  Loader2,
  Download,
  RefreshCw,
  Volume2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Avatar {
  id: string;
  imageUrl: string;
  label: string;
}

interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
  quality: number;
}

const BUTTON_STYLES = [
  { id: "gradient", label: "Gradient Neon", className: "bg-gradient-to-r from-pink-500 to-purple-600 text-white" },
  { id: "outline", label: "Outline Glow", className: "border-2 border-pink-500 text-pink-500" },
  { id: "solid-blue", label: "Solid Blue", className: "bg-blue-500 text-white" },
  { id: "solid-purple", label: "Solid Purple", className: "bg-purple-600 text-white" },
];

const getVoiceQuality = (voice: SpeechSynthesisVoice): number => {
  const name = voice.name.toLowerCase();
  if (name.includes("google")) return 90;
  if (name.includes("microsoft") && (name.includes("online") || name.includes("neural"))) return 85;
  if (name.includes("microsoft")) return 70;
  if (name.includes("samantha") || name.includes("daniel") || name.includes("karen")) return 75;
  if (voice.localService === false) return 60;
  return 40;
};

const AIAdGenerator: React.FC<{ onVideoGenerated: (file: File) => void }> = ({ onVideoGenerated }) => {
  const { toast } = useToast();
  const [genStep, setGenStep] = useState(1);

  // Step 1: Avatar
  const [gender, setGender] = useState<"male" | "female">("female");
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  // Step 2: App details
  const [adAppName, setAdAppName] = useState("");
  const [adAppLink, setAdAppLink] = useState("");
  const [adButtonStyle, setAdButtonStyle] = useState("gradient");
  const [adButtonText, setAdButtonText] = useState("Install Now");

  // Step 3: Voiceover
  const [voiceScript, setVoiceScript] = useState("");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Step 4: Generate
  const [generating, setGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices();
      const scored = allVoices
        .filter((v) => v.lang.startsWith("en") || v.lang.startsWith("hi"))
        .map((v) => ({ name: v.name, lang: v.lang, voice: v, quality: getVoiceQuality(v) }))
        .sort((a, b) => b.quality - a.quality)
        .slice(0, 15);
      if (scored.length > 0) setVoices(scored);
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const generateAvatars = async () => {
    setLoadingAvatars(true);
    setAvatars([]);
    setSelectedAvatar(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad-avatars", { body: { gender } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAvatars(data.avatars || []);
      if (!data.avatars?.length) {
        toast({ title: "No avatars generated", description: "Dobara try karein", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Avatar generation failed", variant: "destructive" });
    } finally {
      setLoadingAvatars(false);
    }
  };

  const previewVoice = () => {
    if (!voiceScript || voices.length === 0) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voiceScript);
    utterance.voice = voices[selectedVoiceIndex].voice;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
  };

  const generateVideo = useCallback(async () => {
    if (!selectedAvatar || !adAppName || !voiceScript) {
      toast({ title: "Error", description: "Saari details fill karein", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGeneratedVideoUrl(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 720;
      canvas.height = 1280;

      // Load avatar image
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = selectedAvatar.imageUrl;
      });

      // Setup audio context
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(dest);
      gainNode.gain.value = 0; // silent - just for stream
      oscillator.start();

      // MediaRecorder
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: 4000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const recordingDone = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      });

      mediaRecorder.start();

      // TTS
      const utterance = new SpeechSynthesisUtterance(voiceScript);
      utterance.voice = voices[selectedVoiceIndex].voice;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      let speaking = false;
      let speechEnded = false;
      const speechDone = new Promise<void>((resolve) => {
        utterance.onstart = () => { speaking = true; };
        utterance.onend = () => { speaking = false; speechEnded = true; resolve(); };
        utterance.onerror = () => { speaking = false; speechEnded = true; resolve(); };
      });

      speechSynthesis.speak(utterance);

      // Animation variables
      let mouthOpenness = 0;
      let frame = 0;
      const words = voiceScript.split(/\s+/);
      const avgWordDuration = 350;
      const totalSpeechDuration = words.length * avgWordDuration;
      const totalDuration = Math.max(8000, totalSpeechDuration + 3000); // extra time for install button
      const startTime = Date.now();

      const wordTimings = words.map((w, i) => ({
        word: w,
        start: i * avgWordDuration,
        end: i * avgWordDuration + avgWordDuration * 0.75,
        syllables: Math.max(1, Math.ceil(w.length / 3)),
      }));

      // Calculate image dimensions to fill canvas (cover mode)
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (imgAspect > canvasAspect) {
        drawH = canvas.height;
        drawW = drawH * imgAspect;
        drawX = (canvas.width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = canvas.width;
        drawH = drawW / imgAspect;
        drawX = 0;
        drawY = (canvas.height - drawH) / 2;
      }

      const drawFrame = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        frame++;

        // Mouth simulation based on word timing
        if (speaking) {
          const currentWord = wordTimings.find((wt) => elapsed >= wt.start && elapsed <= wt.end);
          if (currentWord) {
            const wordProgress = (elapsed - currentWord.start) / (currentWord.end - currentWord.start);
            const syllablePhase = wordProgress * currentWord.syllables * Math.PI * 2;
            const target = Math.abs(Math.sin(syllablePhase)) * 0.85 + 0.15;
            mouthOpenness += (target - mouthOpenness) * 0.35;
          } else {
            // Between words
            mouthOpenness += (0 - mouthOpenness) * 0.25;
          }
        } else {
          mouthOpenness += (0 - mouthOpenness) * 0.2;
        }

        // === FULL SCREEN AVATAR (no circle, full frame) ===
        // Subtle head movement when speaking
        const headOffsetX = speaking ? Math.sin(frame * 0.04) * 3 * mouthOpenness : 0;
        const headOffsetY = speaking ? Math.sin(frame * 0.06) * 2 * mouthOpenness : 0;

        // Draw avatar filling entire canvas
        ctx.save();
        ctx.drawImage(img, drawX + headOffsetX, drawY + headOffsetY, drawW, drawH);
        ctx.restore();

        // === REALISTIC LIP-SYNC OVERLAY ===
        // Position mouth area on the lower third of the face
        // Assuming avatar is a portrait: mouth is roughly at 70-75% height from top of face
        const faceTop = drawY;
        const faceHeight = drawH;
        const mouthCenterX = canvas.width / 2 + headOffsetX;
        const mouthCenterY = faceTop + faceHeight * 0.68 + headOffsetY;

        if (mouthOpenness > 0.03) {
          ctx.save();

          // Mouth dimensions scale with openness
          const mouthWidth = canvas.width * 0.08;
          const mouthHeight = mouthOpenness * canvas.width * 0.045;

          // Inner mouth (dark opening) - realistic shape
          const innerGrad = ctx.createRadialGradient(
            mouthCenterX, mouthCenterY, 0,
            mouthCenterX, mouthCenterY, mouthWidth
          );
          innerGrad.addColorStop(0, `rgba(20, 5, 5, ${mouthOpenness * 0.7})`);
          innerGrad.addColorStop(0.5, `rgba(40, 10, 10, ${mouthOpenness * 0.5})`);
          innerGrad.addColorStop(1, `rgba(80, 30, 30, 0)`);

          ctx.fillStyle = innerGrad;
          ctx.beginPath();
          ctx.ellipse(mouthCenterX, mouthCenterY, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);
          ctx.fill();

          // Upper lip shadow
          ctx.fillStyle = `rgba(0, 0, 0, ${mouthOpenness * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(mouthCenterX, mouthCenterY - mouthHeight * 0.5, mouthWidth * 1.2, mouthHeight * 0.4, 0, Math.PI, Math.PI * 2);
          ctx.fill();

          // Lower lip highlight
          ctx.fillStyle = `rgba(180, 80, 80, ${mouthOpenness * 0.1})`;
          ctx.beginPath();
          ctx.ellipse(mouthCenterX, mouthCenterY + mouthHeight * 0.6, mouthWidth * 1.1, mouthHeight * 0.3, 0, 0, Math.PI);
          ctx.fill();

          // Teeth hint when mouth is very open
          if (mouthOpenness > 0.4) {
            ctx.fillStyle = `rgba(240, 240, 235, ${(mouthOpenness - 0.4) * 0.4})`;
            ctx.beginPath();
            ctx.ellipse(mouthCenterX, mouthCenterY - mouthHeight * 0.2, mouthWidth * 0.7, mouthHeight * 0.25, 0, Math.PI, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        // Subtle eye blink every ~3 seconds
        const blinkCycle = (frame % 90);
        if (blinkCycle >= 0 && blinkCycle <= 3) {
          const blinkProgress = blinkCycle <= 1.5 ? blinkCycle / 1.5 : (3 - blinkCycle) / 1.5;
          const eyeY = faceTop + faceHeight * 0.42 + headOffsetY;
          const leftEyeX = canvas.width * 0.4 + headOffsetX;
          const rightEyeX = canvas.width * 0.6 + headOffsetX;
          const eyeW = canvas.width * 0.055;
          const eyeH = blinkProgress * canvas.width * 0.02;

          ctx.fillStyle = `rgba(180, 140, 120, ${blinkProgress * 0.5})`;
          ctx.beginPath();
          ctx.ellipse(leftEyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(rightEyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // === APP NAME (subtle, at top) ===
        const nameAlpha = Math.min(progress * 3, 1);
        ctx.save();
        ctx.globalAlpha = nameAlpha * 0.9;
        // Dark bar behind name
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, 70);
        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(adAppName, canvas.width / 2, 46);
        ctx.restore();

        // === INSTALL BUTTON (appears after speech ends) ===
        const buttonAppearTime = totalSpeechDuration + 500;
        if (elapsed > buttonAppearTime) {
          const btnProgress = Math.min((elapsed - buttonAppearTime) / 800, 1);
          const bounceEase = btnProgress < 0.6
            ? (btnProgress / 0.6) * 1.1
            : 1.1 - Math.sin((btnProgress - 0.6) / 0.4 * Math.PI) * 0.1;
          const btnScale = Math.min(bounceEase, 1);

          const btnW = 320;
          const btnH = 70;
          const btnX = (canvas.width - btnW) / 2;
          const btnY = canvas.height - 180;

          ctx.save();
          ctx.globalAlpha = btnProgress;
          ctx.translate(canvas.width / 2, btnY + btnH / 2);
          ctx.scale(btnScale, btnScale);
          ctx.translate(-canvas.width / 2, -(btnY + btnH / 2));

          // Button glow
          ctx.shadowColor = "rgba(236, 72, 153, 0.7)";
          ctx.shadowBlur = 30 + Math.sin(frame * 0.08) * 10;

          // Button background
          const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
          btnGrad.addColorStop(0, "#ec4899");
          btnGrad.addColorStop(1, "#8b5cf6");
          ctx.fillStyle = btnGrad;
          ctx.beginPath();
          ctx.roundRect(btnX, btnY, btnW, btnH, 35);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Button text
          ctx.font = "bold 26px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(adButtonText, canvas.width / 2, btnY + 44);

          // Pulse ring around button
          const pulsePhase = (frame * 0.05) % (Math.PI * 2);
          const pulseAlpha = Math.max(0, 0.4 - (pulsePhase / (Math.PI * 2)) * 0.4);
          const pulseExpand = (pulsePhase / (Math.PI * 2)) * 20;
          ctx.strokeStyle = `rgba(236, 72, 153, ${pulseAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(btnX - pulseExpand, btnY - pulseExpand, btnW + pulseExpand * 2, btnH + pulseExpand * 2, 35 + pulseExpand);
          ctx.stroke();

          ctx.restore();

          // Link text below button
          ctx.globalAlpha = btnProgress * 0.5;
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "#d1d5db";
          ctx.textAlign = "center";
          ctx.fillText(adAppLink || adAppName, canvas.width / 2, canvas.height - 90);
          ctx.globalAlpha = 1;
        }

        // Progress bar at very bottom
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
        ctx.fillStyle = "#ec4899";
        ctx.fillRect(0, canvas.height - 4, canvas.width * progress, 4);

        if (elapsed < totalDuration) {
          requestAnimationFrame(drawFrame);
        } else {
          speechSynthesis.cancel();
          oscillator.stop();
          setTimeout(() => mediaRecorder.stop(), 500);
        }
      };

      drawFrame();

      await Promise.race([speechDone, new Promise((r) => setTimeout(r, totalDuration))]);
      const blob = await recordingDone;

      const videoUrl = URL.createObjectURL(blob);
      setGeneratedVideoUrl(videoUrl);

      const file = new File([blob], `ai-ad-${Date.now()}.webm`, { type: "video/webm" });
      onVideoGenerated(file);

      toast({ title: "Video Generated! 🎬", description: "Aapka AI ad ready hai" });
      audioCtx.close();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Video generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [selectedAvatar, adAppName, adAppLink, adButtonStyle, adButtonText, voiceScript, voices, selectedVoiceIndex, onVideoGenerated, toast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-neon-pink" />
        <h3 className="font-display font-bold text-lg">AI Ad Generator</h3>
      </div>

      {/* Sub-steps */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setGenStep(s)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              genStep === s
                ? "gradient-neon text-primary-foreground"
                : genStep > s
                ? "bg-neon-pink/20 text-neon-pink"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s === 1 ? "👤 Avatar" : s === 2 ? "📱 Details" : s === 3 ? "🎙️ Voice" : "🎬 Generate"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Avatar Selection */}
        {genStep === 1 && (
          <motion.div key="avatar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="glass border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-3">
                  <Button variant={gender === "male" ? "default" : "outline"} onClick={() => setGender("male")} className="flex-1">
                    <User className="h-4 w-4 mr-1" /> Male
                  </Button>
                  <Button variant={gender === "female" ? "default" : "outline"} onClick={() => setGender("female")} className="flex-1">
                    <Users className="h-4 w-4 mr-1" /> Female
                  </Button>
                </div>

                <Button onClick={generateAvatars} disabled={loadingAvatars} className="w-full gradient-neon text-primary-foreground">
                  {loadingAvatars ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Avatars...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Generate AI Avatars</>
                  )}
                </Button>

                {avatars.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {avatars.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[3/4] ${
                          selectedAvatar?.id === avatar.id
                            ? "border-neon-pink neon-glow scale-105"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <img src={avatar.imageUrl} alt={avatar.label} className="w-full h-full object-cover" />
                        {selectedAvatar?.id === avatar.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full gradient-neon flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        <p className="absolute bottom-0 left-0 right-0 bg-background/80 text-xs py-1 text-center">{avatar.label}</p>
                      </button>
                    ))}
                  </div>
                )}

                {avatars.length > 0 && (
                  <Button variant="ghost" onClick={generateAvatars} disabled={loadingAvatars} className="w-full text-muted-foreground">
                    <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                  </Button>
                )}

                <Button onClick={() => setGenStep(2)} disabled={!selectedAvatar} className="w-full">
                  Next → App Details
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: App Details */}
        {genStep === 2 && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="glass border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label>App Name *</Label>
                  <Input placeholder="Your App Name" value={adAppName} onChange={(e) => setAdAppName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>App Link *</Label>
                  <Input placeholder="https://your-app.com" value={adAppLink} onChange={(e) => setAdAppLink(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Button Text</Label>
                  <Input placeholder="Install Now" value={adButtonText} onChange={(e) => setAdButtonText(e.target.value)} maxLength={30} className="mt-1" />
                </div>
                <div>
                  <Label>Button Style</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {BUTTON_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setAdButtonStyle(style.id)}
                        className={`p-2 rounded-lg border-2 transition-all ${adButtonStyle === style.id ? "border-neon-pink" : "border-border/50"}`}
                      >
                        <div className={`px-3 py-1.5 rounded-md text-xs font-medium text-center ${style.className}`}>{adButtonText || "Install"}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setGenStep(1)} className="flex-1">← Back</Button>
                  <Button onClick={() => setGenStep(3)} disabled={!adAppName} className="flex-1 gradient-neon text-primary-foreground">Next → Voiceover</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Voiceover */}
        {genStep === 3 && (
          <motion.div key="voice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="glass border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-neon-pink" /> Voiceover Script *
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Yeh script avatar khud bolega — jaise real insaan bol raha ho
                  </p>
                  <Textarea
                    placeholder="e.g. 'Download karo abhi! Best gaming app with amazing features and free rewards!'"
                    value={voiceScript}
                    onChange={(e) => setVoiceScript(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{voiceScript.length}/500</p>
                </div>

                <div>
                  <Label className="flex items-center gap-2"><Volume2 className="h-4 w-4" /> Select Voice</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">⭐ Top voices = best quality (Google/Microsoft)</p>
                  {voices.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-2">Loading voices...</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-52 overflow-y-auto">
                      {voices.map((v, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVoiceIndex(idx)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                            selectedVoiceIndex === idx ? "border-neon-pink bg-neon-pink/10" : "border-border/50 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {v.quality >= 80 && <span className="text-xs">⭐</span>}
                            <div>
                              <p className="text-sm font-medium">{v.name.split(" ").slice(0, 3).join(" ")}</p>
                              <p className="text-xs text-muted-foreground">{v.lang} {v.quality >= 80 ? "• HD Voice" : ""}</p>
                            </div>
                          </div>
                          {selectedVoiceIndex === idx && <Check className="h-4 w-4 text-neon-pink" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={previewVoice} disabled={!voiceScript || isPlaying} variant="outline" className="w-full">
                  {isPlaying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Playing...</> : <><Play className="h-4 w-4 mr-2" /> Preview Voice</>}
                </Button>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setGenStep(2)} className="flex-1">← Back</Button>
                  <Button onClick={() => setGenStep(4)} disabled={!voiceScript} className="flex-1 gradient-neon text-primary-foreground">Next → Generate</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Generate */}
        {genStep === 4 && (
          <motion.div key="generate" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="glass border-border/50">
              <CardContent className="pt-4 space-y-4">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                  <p className="text-xs text-muted-foreground font-bold">Ad Preview Summary:</p>
                  <div className="flex items-center gap-3">
                    {selectedAvatar && (
                      <img src={selectedAvatar.imageUrl} alt="avatar" className="w-14 h-18 rounded-lg object-cover border-2 border-neon-pink" />
                    )}
                    <div>
                      <p className="font-bold text-sm">{adAppName}</p>
                      <p className="text-xs text-muted-foreground truncate">{adAppLink}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">🎙️ "{voiceScript.slice(0, 100)}..."</p>
                  <p className="text-xs text-muted-foreground">
                    Voice: {voices[selectedVoiceIndex]?.name || "Default"} {voices[selectedVoiceIndex]?.quality >= 80 ? "⭐ HD" : ""}
                  </p>
                  <p className="text-xs text-neon-pink">
                    ✨ Avatar full-screen bolega + Install button end mein aayega
                  </p>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {generatedVideoUrl ? (
                  <div className="space-y-3">
                    <video src={generatedVideoUrl} controls className="w-full rounded-xl border border-border/50" style={{ maxHeight: 500 }} />
                    <div className="flex gap-2">
                      <a href={generatedVideoUrl} download={`ai-ad-${Date.now()}.webm`} className="flex-1">
                        <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-2" /> Download</Button>
                      </a>
                      <Button onClick={() => { setGeneratedVideoUrl(null); generateVideo(); }} variant="outline" className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">✅ Video auto-attached as your promotion video</p>
                  </div>
                ) : (
                  <Button onClick={generateVideo} disabled={generating} className="w-full gradient-neon text-primary-foreground neon-glow" size="lg">
                    {generating ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating Video...</>
                    ) : (
                      <><Sparkles className="h-5 w-5 mr-2" /> Generate AI Ad Video 🎬</>
                    )}
                  </Button>
                )}

                <Button variant="ghost" onClick={() => setGenStep(3)} className="w-full text-muted-foreground">← Back to Voiceover</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAdGenerator;
