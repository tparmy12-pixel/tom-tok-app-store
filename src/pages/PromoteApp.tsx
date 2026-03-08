import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CreditCard, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import { Upload, Video } from "lucide-react";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const BUTTON_STYLES = [
  { id: "gradient", label: "Gradient Neon", preview: "gradient-neon text-primary-foreground neon-glow" },
  { id: "outline", label: "Outline Glow", preview: "border-2 border-neon-pink text-neon-pink hover:bg-neon-pink/10" },
  { id: "solid-blue", label: "Solid Blue", preview: "bg-neon-blue text-white" },
  { id: "solid-purple", label: "Solid Purple", preview: "bg-neon-purple text-white" },
];

const formSchema = z.object({
  appLink: z.string().url("Valid URL daalein (https://...)"),
  buttonText: z.string().min(1, "Button text required").max(30, "Max 30 characters"),
  description: z.string().max(500).optional(),
  transactionId: z.string().min(4, "Transaction ID daalein"),
});

const PromoteApp: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [appLink, setAppLink] = useState("");
  const [buttonText, setButtonText] = useState("Install Now");
  const [buttonStyle, setButtonStyle] = useState("gradient");
  const [description, setDescription] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const { data: price = "100" } = useQuery({
    queryKey: ["promotion-price"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "promotion_price")
        .single();
      return data?.value || "100";
    },
  });

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-black gradient-neon-text mb-4">Promote Your App</h1>
          <p className="text-muted-foreground mb-6">Apna app promote karne ke liye pehle login karein.</p>
          <Button onClick={() => navigate("/login")} className="gradient-neon text-primary-foreground">
            Login
          </Button>
        </div>
      </Layout>
    );
  }

  const handlePayment = () => {
    const upiUrl = `upi://pay?pa=8279971306@paytm&pn=TomTokStore&am=${price}&cu=INR&tn=App+Promotion+Payment`;
    window.open(upiUrl, "_blank");
    setStep(3);
  };

  const handleSubmit = async () => {
    const validation = formSchema.safeParse({ appLink, buttonText, description, transactionId });
    if (!validation.success) {
      toast({
        title: "Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("promotion_requests").insert({
      user_id: user.id,
      app_link: appLink,
      button_text: buttonText,
      button_style: buttonStyle,
      description,
      transaction_id: transactionId,
      amount: Number(price),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request Submitted! ✅", description: "Admin review ke baad aapka app promote hoga." });
      setStep(4);
    }
    setSubmitting(false);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-black gradient-neon-text mb-2 text-center">
            <Sparkles className="inline h-7 w-7 mr-2" />
            Promote Your App
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Apna app ya website Tom Tok Store pe promote karein
          </p>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s ? "gradient-neon text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 4 && <div className={`w-8 h-0.5 ${step > s ? "bg-neon-pink" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: App Details */}
          {step === 1 && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-neon-pink" /> App Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>App / Website Link *</Label>
                  <Input
                    placeholder="https://your-app-link.com"
                    value={appLink}
                    onChange={(e) => setAppLink(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Install Button Text *</Label>
                  <Input
                    placeholder="Install Now"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    maxLength={30}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{buttonText.length}/30 characters</p>
                </div>

                <div>
                  <Label>Button Style</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {BUTTON_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setButtonStyle(style.id)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          buttonStyle === style.id
                            ? "border-neon-pink neon-glow"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium text-center ${style.preview}`}>
                          {buttonText || "Install"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">{style.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Apne app ke baare mein likhen..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => {
                    if (!appLink) {
                      toast({ title: "Error", description: "App link daalein", variant: "destructive" });
                      return;
                    }
                    setStep(2);
                  }}
                  className="w-full gradient-neon text-primary-foreground neon-glow"
                >
                  Next → Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-neon-blue" /> Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-center">
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-muted-foreground text-sm mb-2">Promotion Fee</p>
                  <p className="text-4xl font-black gradient-neon-text">₹{price}</p>
                </div>

                <div className="text-left space-y-2">
                  <p className="text-sm text-muted-foreground">Payment Details:</p>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                    <p className="text-sm"><span className="text-muted-foreground">Paytm Number:</span> <span className="font-mono font-bold">8279971306</span></p>
                    <p className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-bold">₹{price}</span></p>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  className="w-full bg-neon-blue hover:bg-neon-blue/90 text-white"
                  size="lg"
                >
                  Pay via Paytm / UPI →
                </Button>

                <p className="text-xs text-muted-foreground">
                  Payment ke baad transaction ID enter karein
                </p>

                <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">
                  ← Back
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Transaction ID */}
          {step === 3 && (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-neon-green" /> Transaction ID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-muted-foreground text-sm">
                  Payment complete hone ke baad apna Transaction ID yahan paste karein.
                </p>

                <div>
                  <Label>Transaction ID *</Label>
                  <Input
                    placeholder="e.g. TXN1234567890"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-3">Preview:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-neon flex items-center justify-center text-primary-foreground font-bold text-sm">
                      A
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm truncate">{appLink || "Your App"}</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-lg text-xs font-medium ${
                      BUTTON_STYLES.find(s => s.id === buttonStyle)?.preview || ""
                    }`}>
                      {buttonText}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full gradient-neon text-primary-foreground neon-glow"
                  size="lg"
                >
                  {submitting ? "Submitting..." : "Submit Request ✅"}
                </Button>

                <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground w-full">
                  ← Back
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <Card className="glass border-border/50 text-center">
              <CardContent className="py-12 space-y-4">
                <div className="w-16 h-16 rounded-full gradient-neon flex items-center justify-center mx-auto neon-glow">
                  <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold">Request Submitted!</h2>
                <p className="text-muted-foreground">
                  Aapki request admin ke paas gayi hai. Approve hone ke baad aapka app promote hoga.
                </p>
                <Button onClick={() => navigate("/")} variant="outline" className="mt-4">
                  Home Page →
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default PromoteApp;
