import React from "react";
import { Link } from "react-router-dom";
import { Download, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";

interface AppCardProps {
  app: Tables<"apps">;
}

const AppCard: React.FC<AppCardProps> = ({ app }) => {
  const formatCount = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link
        to={`/app/${app.id}`}
        className="block rounded-xl bg-card border border-border/50 overflow-hidden hover:neon-glow transition-shadow duration-300"
      >
        <div className="aspect-square bg-muted/50 flex items-center justify-center p-4">
          {app.icon_url ? (
            <img src={app.icon_url} alt={app.name} className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl gradient-neon flex items-center justify-center">
              <span className="font-display text-2xl font-bold text-primary-foreground">
                {app.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm truncate text-foreground">{app.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{app.category}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-neon-pink text-neon-pink" />
              <span>{app.rating?.toFixed(1) || "4.5"}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>{formatCount(app.download_count)}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default AppCard;
