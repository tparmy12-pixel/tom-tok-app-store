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
  quality: number; // higher = better
}

const BUTTON_STYLES = [
  { id: "gradient", label: "Gradient Neon", className: "bg-gradient-to-r from-pink-500 to-purple-600 text-white" },
  { id: "outline", label: "Outline Glow", className: "border-2 border-pink-500 text-pink-500" },
  { id: "solid-blue", label: "Solid Blue", className: "bg-blue-500 text-white" },
  { id: "solid-purple", label: "Solid Purple", className: "bg-purple-600 text-white" },
];

// Prioritize high-quality voices
const getVoiceQuality = (voice: SpeechSynthesisVoice): number => {
  const name = voice.name.toLowerCase();
  if (name.includes("google")) return 90;
  if (name.includes("microsoft") && (name.includes("online") || name.includes("neural"))) return 85;
  if (name.includes("microsoft")) return 70;
  if (name.includes("samantha") || name.includes("daniel") || name.includes("karen")) return 75;
  if (voice.localService === false) return 60; // cloud/network voices
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

  // Load and sort voices by quality
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices();
      const scored = allVoices
        .filter((v) => v.lang.startsWith("en") || v.lang.startsWith("hi"))
        .map((v) => ({
          name: v.name,
          lang: v.lang,
          voice: v,
          quality: getVoiceQuality(v),
        }))
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
      const { data, error } = await supabase.functions.invoke("generate-ad-avatars", {
        body: { gender },
      });
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

      // Setup audio context for amplitude analysis
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Create oscillator destination for capturing audio
      const dest = audioCtx.createMediaStreamDestination();
      analyser.connect(dest);

      // Setup MediaRecorder with combined audio+video streams
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: 3000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
      });

      mediaRecorder.start();

      // TTS with Web Audio routing for analysis
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

      // Simulate audio amplitude for talking animation (since we can't route SpeechSynthesis to AnalyserNode)
      let simulatedAmplitude = 0;
      let mouthOpenness = 0;
      const words = voiceScript.split(/\s+/);
      const avgWordDuration = 350; // ms per word estimate
      const totalSpeechDuration = words.length * avgWordDuration;

      // Animation
      const buttonStyleObj = BUTTON_STYLES.find((s) => s.id === adButtonStyle);
      let frame = 0;
      const totalDuration = Math.max(6000, totalSpeechDuration + 2000);
      const startTime = Date.now();

      // Pre-calculate word timings for mouth simulation
      const wordTimings = words.map((w, i) => ({
        word: w,
        start: i * avgWordDuration,
        end: i * avgWordDuration + avgWordDuration * 0.7,
        syllables: Math.max(1, Math.ceil(w.length / 3)),
      }));

      const drawFrame = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        frame++;

        // Simulate mouth movement based on word timing
        if (speaking) {
          const speechElapsed = elapsed;
          const currentWord = wordTimings.find(
            (wt) => speechElapsed >= wt.start && speechElapsed <= wt.end
          );
          if (currentWord) {
            // Simulate syllable-based mouth movement
            const wordProgress = (speechElapsed - currentWord.start) / (currentWord.end - currentWord.start);
            const syllablePhase = wordProgress * currentWord.syllables * Math.PI * 2;
            simulatedAmplitude = Math.abs(Math.sin(syllablePhase)) * 0.8 + 0.2;
          } else {
            // Between words - mouth closing
            simulatedAmplitude *= 0.7;
          }
        } else {
          simulatedAmplitude *= 0.85;
        }

        // Smooth mouth openness
        mouthOpenness += (simulatedAmplitude - mouthOpenness) * 0.3;

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, "#0a0a1a");
        grad.addColorStop(0.3, "#121230");
        grad.addColorStop(0.7, "#1a0a2e");
        grad.addColorStop(1, "#0a0a1a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated particles
        for (let i = 0; i < 30; i++) {
          const x = ((i * 73 + frame * 0.4) % canvas.width);
          const y = ((i * 97 + frame * 0.2) % canvas.height);
          const alpha = 0.05 + Math.sin(frame * 0.015 + i) * 0.05;
          const hue = (frame * 0.3 + i * 20) % 360;
          ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.5 + Math.sin(frame * 0.03 + i) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // === TALKING AVATAR ===
        const avatarSize = 320;
        const avatarX = (canvas.width - avatarSize) / 2;
        const avatarY = 80;
        const avatarCenterX = avatarX + avatarSize / 2;
        const avatarCenterY = avatarY + avatarSize / 2;

        // Subtle head bob when speaking
        const headBob = speaking ? Math.sin(frame * 0.08) * 3 * mouthOpenness : 0;
        const headTilt = speaking ? Math.sin(frame * 0.05) * 1.5 * mouthOpenness : 0;

        // Glow ring (pulses with speech)
        const glowIntensity = 0.4 + mouthOpenness * 0.4;
        const ringRadius = avatarSize / 2 + 8 + mouthOpenness * 4;
        
        // Outer glow
        ctx.shadowColor = `rgba(236, 72, 153, ${glowIntensity})`;
        ctx.shadowBlur = 25 + mouthOpenness * 15;
        ctx.strokeStyle = `rgba(236, 72, 153, ${0.6 + mouthOpenness * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY + headBob, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Second ring
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.3 + mouthOpenness * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY + headBob, ringRadius + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Audio wave ring around avatar when speaking
        if (speaking && mouthOpenness > 0.1) {
          ctx.save();
          ctx.strokeStyle = `rgba(236, 72, 153, ${mouthOpenness * 0.3})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
            const waveAmplitude = 5 + mouthOpenness * 12;
            const wave = Math.sin(angle * 8 + frame * 0.15) * waveAmplitude;
            const r = ringRadius + 15 + wave;
            const wx = avatarCenterX + Math.cos(angle) * r;
            const wy = avatarCenterY + headBob + Math.sin(angle) * r;
            if (angle === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }

        // Draw avatar with head movement
        ctx.save();
        ctx.translate(avatarCenterX, avatarCenterY + headBob);
        ctx.rotate((headTilt * Math.PI) / 180);
        ctx.beginPath();
        ctx.arc(0, 0, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);

        // Mouth animation overlay (subtle darkening at bottom for open mouth effect)
        if (mouthOpenness > 0.05) {
          const mouthY = avatarSize * 0.15; // relative to center
          const mouthWidth = avatarSize * 0.25;
          const mouthHeight = mouthOpenness * avatarSize * 0.08;

          // Dark mouth opening
          ctx.fillStyle = `rgba(30, 10, 10, ${mouthOpenness * 0.6})`;
          ctx.beginPath();
          ctx.ellipse(0, mouthY, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);
          ctx.fill();

          // Slight reddish tint around mouth
          ctx.fillStyle = `rgba(180, 60, 60, ${mouthOpenness * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(0, mouthY, mouthWidth * 1.3, mouthHeight * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // "LIVE" / Speaking indicator
        if (speaking) {
          const indicatorY = avatarY + avatarSize + 25 + headBob;
          ctx.fillStyle = `rgba(34, 197, 94, ${0.7 + Math.sin(frame * 0.1) * 0.3})`;
          ctx.beginPath();
          ctx.arc(canvas.width / 2 - 40, indicatorY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
          ctx.textAlign = "left";
          ctx.fillText("SPEAKING", canvas.width / 2 - 30, indicatorY + 5);
          ctx.textAlign = "center";
        }

        // App Name with slide-in
        const nameY = avatarY + avatarSize + 70;
        const nameAlpha = Math.min(progress * 4, 1);
        ctx.globalAlpha = nameAlpha;
        ctx.font = "bold 44px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(236, 72, 153, 0.5)";
        ctx.shadowBlur = 10;
        ctx.fillText(adAppName, canvas.width / 2, nameY);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Script text (karaoke-style - words highlight as spoken)
        if (progress > 0.1) {
          const scriptY = nameY + 50;
          ctx.font = "22px sans-serif";
          ctx.textAlign = "center";

          const scriptWords = voiceScript.split(" ");
          const spokenWordIndex = speaking
            ? Math.floor(elapsed / avgWordDuration)
            : scriptWords.length;

          // Render script with word highlighting
          let lineText = "";
          let lineY = scriptY;
          const maxWidth = canvas.width - 100;
          const allLines: { text: string; startIdx: number; endIdx: number }[] = [];
          let currentLineStart = 0;

          for (let i = 0; i < scriptWords.length; i++) {
            const testLine = lineText + scriptWords[i] + " ";
            if (ctx.measureText(testLine).width > maxWidth && lineText) {
              allLines.push({ text: lineText.trim(), startIdx: currentLineStart, endIdx: i - 1 });
              lineText = scriptWords[i] + " ";
              currentLineStart = i;
            } else {
              lineText = testLine;
            }
          }
          if (lineText) allLines.push({ text: lineText.trim(), startIdx: currentLineStart, endIdx: scriptWords.length - 1 });

          // Only show 3 lines at a time
          const currentLineIdx = allLines.findIndex(
            (l) => spokenWordIndex >= l.startIdx && spokenWordIndex <= l.endIdx
          );
          const visibleStart = Math.max(0, currentLineIdx - 1);
          const visibleLines = allLines.slice(visibleStart, visibleStart + 3);

          visibleLines.forEach((line, li) => {
            const y = scriptY + li * 34;
            if (y > canvas.height - 300) return;

            // Draw each word with highlighting
            const lineWords = line.text.split(" ");
            let xPos = canvas.width / 2 - ctx.measureText(line.text).width / 2;

            lineWords.forEach((word, wi) => {
              const globalWordIdx = line.startIdx + wi;
              const isSpoken = globalWordIdx < spokenWordIndex;
              const isCurrent = globalWordIdx === spokenWordIndex;

              if (isCurrent) {
                ctx.fillStyle = "#ec4899";
                ctx.font = "bold 24px sans-serif";
              } else if (isSpoken) {
                ctx.fillStyle = "#d1d5db";
                ctx.font = "22px sans-serif";
              } else {
                ctx.fillStyle = "#6b7280";
                ctx.font = "22px sans-serif";
              }

              ctx.textAlign = "left";
              ctx.fillText(word + " ", xPos, y);
              xPos += ctx.measureText(word + " ").width;
            });
          });

          ctx.textAlign = "center";
        }

        // Install button with bounce
        if (progress > 0.3) {
          const btnAlpha = Math.min((progress - 0.3) * 4, 1);
          const bounce = Math.sin(frame * 0.06) * 4;
          const btnY = canvas.height - 220 + bounce;
          const btnW = 300;
          const btnH = 64;
          const btnX = (canvas.width - btnW) / 2;

          ctx.globalAlpha = btnAlpha;

          const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
          btnGrad.addColorStop(0, "#ec4899");
          btnGrad.addColorStop(1, "#8b5cf6");
          ctx.fillStyle = btnGrad;

          ctx.shadowColor = "rgba(236, 72, 153, 0.6)";
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.roundRect(btnX, btnY, btnW, btnH, 32);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.font = "bold 24px sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(adButtonText, canvas.width / 2, btnY + 40);
          ctx.globalAlpha = 1;
        }

        // App link at bottom
        if (progress > 0.5) {
          ctx.globalAlpha = Math.min((progress - 0.5) * 4, 0.5);
          ctx.font = "15px sans-serif";
          ctx.fillStyle = "#6b7280";
          ctx.fillText(adAppLink || adAppName, canvas.width / 2, canvas.height - 80);
          ctx.globalAlpha = 1;
        }

        // Progress bar
        ctx.fillStyle = "rgba(236, 72, 153, 0.15)";
        ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
        ctx.fillStyle = "#ec4899";
        ctx.fillRect(0, canvas.height - 4, canvas.width * progress, 4);

        if (elapsed < totalDuration) {
          requestAnimationFrame(drawFrame);
        } else {
          speechSynthesis.cancel();
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
                  <Button
                    variant={gender === "male" ? "default" : "outline"}
                    onClick={() => setGender("male")}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-1" /> Male
                  </Button>
                  <Button
                    variant={gender === "female" ? "default" : "outline"}
                    onClick={() => setGender("female")}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-1" /> Female
                  </Button>
                </div>

                <Button
                  onClick={generateAvatars}
                  disabled={loadingAvatars}
                  className="w-full gradient-neon text-primary-foreground"
                >
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
                        className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                          selectedAvatar?.id === avatar.id
                            ? "border-neon-pink neon-glow scale-105"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <img
                          src={avatar.imageUrl}
                          alt={avatar.label}
                          className="w-full h-full object-cover"
                        />
                        {selectedAvatar?.id === avatar.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full gradient-neon flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                        <p className="absolute bottom-0 left-0 right-0 bg-background/80 text-xs py-1 text-center">
                          {avatar.label}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {avatars.length > 0 && (
                  <Button variant="ghost" onClick={generateAvatars} disabled={loadingAvatars} className="w-full text-muted-foreground">
                    <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                  </Button>
                )}

                <Button
                  onClick={() => setGenStep(2)}
                  disabled={!selectedAvatar}
                  className="w-full"
                >
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
                        className={`p-2 rounded-lg border-2 transition-all ${
                          adButtonStyle === style.id ? "border-neon-pink" : "border-border/50"
                        }`}
                      >
                        <div className={`px-3 py-1.5 rounded-md text-xs font-medium text-center ${style.className}`}>
                          {adButtonText || "Install"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setGenStep(1)} className="flex-1">← Back</Button>
                  <Button onClick={() => setGenStep(3)} disabled={!adAppName} className="flex-1 gradient-neon text-primary-foreground">
                    Next → Voiceover
                  </Button>
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
                  <Textarea
                    placeholder="Apne app ke baare mein script likhein... e.g. 'Download karo abhi! Best gaming app with amazing features and free rewards!'"
                    value={voiceScript}
                    onChange={(e) => setVoiceScript(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{voiceScript.length}/500</p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" /> Select Voice
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    ⭐ Top voices sabse pehle dikhaye gaye hain (Google/Microsoft = best quality)
                  </p>
                  {voices.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-2">Loading voices...</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-52 overflow-y-auto">
                      {voices.map((v, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVoiceIndex(idx)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                            selectedVoiceIndex === idx
                              ? "border-neon-pink bg-neon-pink/10"
                              : "border-border/50 hover:border-border"
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

                <Button
                  onClick={previewVoice}
                  disabled={!voiceScript || isPlaying}
                  variant="outline"
                  className="w-full"
                >
                  {isPlaying ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Playing...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Preview Voice</>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setGenStep(2)} className="flex-1">← Back</Button>
                  <Button onClick={() => setGenStep(4)} disabled={!voiceScript} className="flex-1 gradient-neon text-primary-foreground">
                    Next → Generate
                  </Button>
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
                      <img src={selectedAvatar.imageUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border-2 border-neon-pink" />
                    )}
                    <div>
                      <p className="font-bold text-sm">{adAppName}</p>
                      <p className="text-xs text-muted-foreground truncate">{adAppLink}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">"{voiceScript.slice(0, 100)}..."</p>
                  <p className="text-xs text-muted-foreground">
                    Voice: {voices[selectedVoiceIndex]?.name || "Default"} {voices[selectedVoiceIndex]?.quality >= 80 ? "⭐ HD" : ""}
                  </p>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {generatedVideoUrl ? (
                  <div className="space-y-3">
                    <video src={generatedVideoUrl} controls className="w-full rounded-xl border border-border/50" style={{ maxHeight: 400 }} />
                    <div className="flex gap-2">
                      <a href={generatedVideoUrl} download={`ai-ad-${Date.now()}.webm`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Download className="h-4 w-4 mr-2" /> Download
                        </Button>
                      </a>
                      <Button
                        onClick={() => { setGeneratedVideoUrl(null); generateVideo(); }}
                        variant="outline"
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">✅ Video auto-attached as your promotion video</p>
                  </div>
                ) : (
                  <Button
                    onClick={generateVideo}
                    disabled={generating}
                    className="w-full gradient-neon text-primary-foreground neon-glow"
                    size="lg"
                  >
                    {generating ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating Video...</>
                    ) : (
                      <><Sparkles className="h-5 w-5 mr-2" /> Generate AI Ad Video 🎬</>
                    )}
                  </Button>
                )}

                <Button variant="ghost" onClick={() => setGenStep(3)} className="w-full text-muted-foreground">
                  ← Back to Voiceover
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAdGenerator;
