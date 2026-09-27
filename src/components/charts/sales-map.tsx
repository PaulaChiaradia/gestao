"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Layer, Map as LeafletMap } from "leaflet";
import { CircleDot, Flame } from "lucide-react";
import { formatBRL, formatInt } from "@/lib/format";

export type MapPoint = { key: string; label: string; revenue: number; count: number; lat: number; lng: number };
type Mode = "pontos" | "calor";

// Mesma rampa verde do mapa por estado (validada), do mais fraco ao mais forte
const HEAT_GRADIENT = { 0.15: "#c9e0c5", 0.35: "#8dbb88", 0.55: "#6ea468", 0.75: "#3d6e37", 1: "#2a5226" };
const BRAZIL_BOUNDS: [[number, number], [number, number]] = [[-33.8, -74], [5.3, -34.7]];

function tooltipContent(p: MapPoint) {
  // Texto via textContent: nomes vêm de dados, nunca como HTML
  const el = document.createElement("div");
  const value = document.createElement("strong");
  value.textContent = formatBRL(p.revenue);
  const count = document.createElement("div");
  count.textContent = `${formatInt(p.count)} ${p.count === 1 ? "venda" : "vendas"}`;
  const label = document.createElement("div");
  label.style.color = "#6f6a62";
  label.textContent = `DDD ${p.key} · ${p.label}`;
  el.append(value, count, label);
  return el;
}

export function SalesMap({ points, withoutLocation }: { points: MapPoint[]; withoutLocation: number }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<{ pontos?: Layer; calor?: Layer }>({});
  const [mode, setMode] = useState<Mode>("pontos");
  const [ready, setReady] = useState(false);

  // Cria o mapa uma vez (Leaflet só existe no navegador)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof L }).L = L; // o plugin de calor procura o Leaflet global
      await import("leaflet.heat");
      if (cancelled || !container.current || map.current) return;
      map.current = L.map(container.current, { zoomSnap: 0.25, scrollWheelZoom: false, attributionControl: true }).fitBounds(
        BRAZIL_BOUNDS,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 12,
      }).addTo(map.current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Recria as camadas quando os dados (filtros) mudam
  useEffect(() => {
    if (!ready || !map.current) return;
    let active = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!active || !map.current) return;
      layers.current.pontos?.remove();
      layers.current.calor?.remove();

      const max = Math.max(...points.map((p) => p.revenue), 1);
      const bubbles = L.layerGroup(
        [...points]
          .sort((a, b) => b.revenue - a.revenue) // maiores embaixo, menores clicáveis por cima
          .map((p) =>
            L.circleMarker([p.lat, p.lng], {
              radius: 5 + Math.sqrt(p.revenue / max) * 26, // área proporcional ao faturamento
              color: "#ffffff",
              weight: 1.5,
              fillColor: "#528a4a",
              fillOpacity: 0.6,
            }).bindTooltip(tooltipContent(p), { direction: "top", offset: [0, -4] }),
          ),
      );
      const heatLayer = (L as unknown as { heatLayer: (pts: [number, number, number][], opts: object) => Layer }).heatLayer(
        points.map((p) => [p.lat, p.lng, p.revenue / max]),
        // maxZoom baixo: o plugin atenua a intensidade quando o mapa está afastado (visão do Brasil)
        { radius: 30, blur: 24, maxZoom: 4, max: 1, minOpacity: 0.3, gradient: HEAT_GRADIENT },
      );
      layers.current = { pontos: bubbles, calor: heatLayer };
      layers.current[mode]?.addTo(map.current);
    })();
    return () => {
      active = false;
    };
    // mode é tratado no efeito abaixo para não recriar as camadas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, ready]);

  useEffect(() => {
    if (!map.current) return;
    const { pontos, calor } = layers.current;
    if (mode === "pontos") {
      calor?.remove();
      if (pontos && !map.current.hasLayer(pontos)) pontos.addTo(map.current);
    } else {
      pontos?.remove();
      if (calor && !map.current.hasLayer(calor)) calor.addTo(map.current);
    }
  }, [mode]);

  const total = points.reduce((s, p) => s + p.count, 0);

  return (
    <div>
      <div className="sales-map relative overflow-hidden rounded-xl border border-border">
        <div ref={container} className="h-[560px] w-full bg-[#f2efe9]" />

        {/* Pontos × calor */}
        <div className="absolute right-3 top-3 z-[1000] flex rounded-lg border border-border bg-surface p-0.5 shadow-sm">
          {(
            [
              ["pontos", "Pontos", CircleDot],
              ["calor", "Mapa de calor", Flame],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
                mode === value ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Legenda */}
        <div className="absolute bottom-6 left-3 z-[1000] rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs shadow-sm">
          {mode === "pontos" ? (
            <div className="flex items-center gap-3">
              <span className="text-muted">Tamanho = faturamento</span>
              <span className="flex items-end gap-1.5">
                {[8, 14, 22].map((d) => (
                  <span
                    key={d}
                    className="rounded-full border border-white bg-[#528a4a]/60"
                    style={{ width: d, height: d }}
                  />
                ))}
              </span>
            </div>
          ) : (
            <div className="w-44">
              <p className="mb-1 text-muted">Concentração do faturamento</p>
              <div
                className="h-2 rounded-full"
                style={{ background: "linear-gradient(to right, #c9e0c5, #8dbb88, #6ea468, #3d6e37, #2a5226)" }}
              />
              <div className="mt-0.5 flex justify-between text-muted">
                <span>menor</span>
                <span>maior</span>
              </div>
            </div>
          )}
        </div>

        {!points.length && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface/70 text-sm text-muted">
            Nenhuma venda com localização neste período.
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        Localização aproximada: cada ponto é a região do DDD do celular do comprador, posicionada na cidade principal da
        região ({formatInt(total)} {total === 1 ? "venda" : "vendas"}).
        {withoutLocation > 0 &&
          ` ${formatInt(withoutLocation)} ${withoutLocation === 1 ? "venda ficou" : "vendas ficaram"} fora do mapa (exterior ou sem celular).`}
      </p>
    </div>
  );
}
