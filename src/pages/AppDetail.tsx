import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import VideoAd from "@/components/VideoAd";
import { Button } from "@/components/ui/button";
import { Download, Star, Calendar, HardDrive, Tag } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AppDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [showAd, setShowAd] = useState(false);
  const [adVideoUrl, setAdVideoUrl] = useState("");

  const { data: app, isLoading } = useQuery({
    queryKey: ["app", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch approved promotions with videos
  const { data: promotions = [] } = useQuery({
    queryKey: ["active-promotions-with-video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotion_requests")
        .select("video_url")
        .eq("status", "approved")
        .not("video_url", "is", null);
      if (error) throw error;
      return (data || []).filter((p: any) => p.video_url);
    },
  });


  const proceedDownload = async () => {
    if (!app || !user) return;
    
    // Track the download
    await supabase.from("downloads").insert({ app_id: app.id, user_id: user.id });
    await supabase.rpc("increment_download_count", { _app_id: app.id });
    
    if (!app.apk_url) {
      toast.error("APK abhi available nahi hai. Admin se upload hone ka wait karein.");
      return;
    }

    // Direct file download from our store
    toast.success(`${app.name} download ho raha hai...`);
    const link = document.createElement("a");
    link.href = app.apk_url;
    link.download = `${app.name.replace(/\s+/g, '-')}.apk`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async () => {
    if (!app) return;
    if (!user) { toast.error("Please login to download"); return; }

    // Show a random video ad if available
    if (promotions.length > 0) {
      const randomPromo = promotions[Math.floor(Math.random() * promotions.length)];
      setAdVideoUrl(randomPromo.video_url);
      setShowAd(true);
    } else {
      proceedDownload();
    }
  };

  const handleAdComplete = () => {
    setShowAd(false);
    proceedDownload();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-32 w-32 rounded-3xl bg-muted" />
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!app) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          App not found.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Video Ad Overlay */}
      {showAd && adVideoUrl && (
        <VideoAd
          videoUrl={adVideoUrl}
          onComplete={handleAdComplete}
          onSkip={handleAdComplete}
          skipAfterSeconds={4}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-6"
        >
          {/* Icon */}
          <div className="shrink-0">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="w-32 h-32 rounded-3xl object-cover neon-glow" />
            ) : (
              <div className="w-32 h-32 rounded-3xl gradient-neon flex items-center justify-center neon-glow">
                <span className="font-display text-4xl font-black text-primary-foreground">
                  {app.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-black text-foreground">{app.name}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-neon-pink text-neon-pink" />
                {app.rating?.toFixed(1) || "4.5"}
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                {app.download_count} downloads
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                {app.size || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                v{app.version}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(app.updated_at).toLocaleDateString()}
              </span>
            </div>
            <Button
              onClick={handleDownload}
              className="mt-6 gradient-neon text-primary-foreground neon-glow px-8"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Download APK
            </Button>
          </div>
        </motion.div>

        {/* Screenshots */}
        {app.screenshots && app.screenshots.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Screenshots</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {app.screenshots.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="h-64 rounded-xl border border-border/50 object-cover shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-10">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">About</h2>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {app.description || "No description available."}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AppDetail;
