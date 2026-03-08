import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import AppCard from "@/components/AppCard";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const CATEGORIES = ["All", "Social", "Games", "Tools", "Entertainment", "Education", "Other"];

const Index: React.FC = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const navigate = useNavigate();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("*")
        .order("download_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = apps.filter((app) => {
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || app.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <Layout showSearch onSearch={setSearch}>
      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-neon opacity-20" />
        <div className="relative container mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img src={logo} alt="Tom Tok Store" className="w-24 h-24 rounded-2xl mx-auto mb-6 neon-glow object-cover" />
            <h1 className="font-display text-4xl md:text-5xl font-black gradient-neon-text mb-4">
              Tom Tok Store
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Discover amazing apps and games. Download with confidence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === cat
                  ? "gradient-neon text-primary-foreground neon-glow"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* App Grid */}
      <section className="container mx-auto px-4 pb-12">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border/50 animate-pulse">
                <div className="aspect-square bg-muted/50" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No apps found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {apps.length === 0 ? "Apps will appear here once uploaded by admin." : "Try a different search or category."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <AppCard app={app} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Index;
