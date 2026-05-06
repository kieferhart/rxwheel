import { useState, useRef, useEffect } from "react";

const MED_COLORS = [
  { name: "cyan", dot: "#22d3ee", ring: "#0e7490", chip: "cyan" },
  { name: "rose", dot: "#fb7185", ring: "#9f1239", chip: "rose" },
  { name: "lime", dot: "#a3e635", ring: "#3f6212", chip: "lime" },
  { name: "violet", dot: "#c084fc", ring: "#6b21a8", chip: "violet" },
  { name: "orange", dot: "#fb923c", ring: "#9a3412", chip: "orange" },
];

let nextId = 1;
const newMed = (i = 0) => ({
  id: nextId++,
  count: 3,
  offset: 8 + i * 1.5, // stagger initial offsets so dots don't overlap
  color: MED_COLORS[i % MED_COLORS.length],
  name: `Medication ${i + 1}`,
  doseOffsets: [0, 0, 0], // per-dose drift in hours; constrained so adjacent gaps stay within ±20%
});

// Maximum drift constraint: any two consecutive doses' gap must stay within ±20% of equal spacing
const GAP_TOLERANCE = 0.2;

const DELETE_THRESHOLD = 105; // pixels swiped left before delete triggers


function MedRow({ med, doses, spacing, hour12, formatHour, formatSpacing, updateMed, removeMed, canDelete }) {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(null);
  const dragging = useRef(false);
  const offsetRef = useRef(0);

  const setOffset = (v) => {
    offsetRef.current = v;
    setOffsetX(v);
  };

  const handlePointerDown = (e) => {
    if (e.target.closest("button")) return;
    const point = e.touches ? e.touches[0] : e;
    startX.current = point.clientX;
    dragging.current = true;
  };

  const handlePointerMove = (e) => {
    if (!dragging.current || startX.current === null) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX.current;
    if (dx < 0) {
      setOffset(Math.max(dx, -200));
    } else {
      setOffset(0);
    }
  };

  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offsetRef.current <= -DELETE_THRESHOLD) {
      removeMed(med.id);
    } else {
      setOffset(0);
    }
    startX.current = null;
  };

  const willDelete = offsetX <= -DELETE_THRESHOLD;
  const revealAmount = Math.min(-offsetX, 200);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ width: "390px", maxWidth: "92vw" }}
    >
      {/* Trash icon revealed behind the pill (no background) */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 pointer-events-none"
        style={{
          opacity: revealAmount > 0 ? 1 : 0,
          color: willDelete ? "#f87171" : "#94a3b8",
          transition: "color 150ms",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
      </div>

      {/* The pill itself, slides left over the red zone */}
      <div
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className="relative flex flex-col gap-1.5 rounded-2xl py-2 px-3"
        style={{
          backgroundColor: `${med.color.dot}22`,
          border: `1px solid ${med.color.dot}33`,
          width: "390px",
          maxWidth: "92vw",
          transform: `translateX(${offsetX}px)`,
          transition: dragging.current ? "none" : "transform 200ms ease-out",
          touchAction: "pan-y",
        }}
      >
        {/* Name input */}
        <input
          type="text"
          value={med.name}
          onChange={(e) => updateMed(med.id, { name: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder="Medication name"
          className="text-[13px] font-medium bg-transparent border-none outline-none w-full"
          style={{
            color: med.color.dot,
          }}
        />

        {/* Row: controls + chips */}
        <div className="flex items-start gap-2">
          {/* Left side: count controls + frequency */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => updateMed(med.id, { count: Math.max(1, med.count - 1) })}
              className="w-6 h-6 shrink-0 rounded-full bg-slate-700 active:bg-slate-500 flex items-center justify-center text-sm font-light"
            >
              −
            </button>
            <span className="text-[13px] font-medium shrink-0 tabular-nums">{med.count}×</span>
            <button
              onClick={() => updateMed(med.id, { count: Math.min(24, med.count + 1) })}
              className="w-6 h-6 shrink-0 rounded-full bg-slate-700 active:bg-slate-500 flex items-center justify-center text-sm font-light"
            >
              +
            </button>
            <span className="text-[13px] text-slate-400 shrink-0 tabular-nums whitespace-nowrap">
              {formatSpacing(spacing)}
            </span>
            <div className="w-px h-5 bg-slate-700 shrink-0" />
          </div>

          {/* Right side: chips in a 3-column grid */}
          <div className="grid grid-cols-3 gap-1 flex-1 min-w-0 pt-0.5">
            {doses.map((d, i) => (
              <span
                key={i}
                className={`text-[13px] leading-none px-2 py-1 rounded font-mono border whitespace-nowrap flex items-center justify-center ${
                  d.isDay
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : "bg-indigo-500/10 border-indigo-400/40 text-indigo-300"
                }`}
              >
                {formatHour(d.h)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [meds, setMeds] = useState([newMed(0)]);
  const [dragging, setDragging] = useState(null); // medId or null
  // freeDose tracks which dose (if any) is in independent-drag mode after double-tap.
  // Shape: { medId, doseIndex } or null
  const [freeDose, setFreeDose] = useState(null);
  // Track tap timing for double-tap detection
  const lastTapRef = useRef({ medId: null, doseIndex: null, time: 0 });

  // Any tap on the SVG background (not on a dot) clears fine-tuning.
  // Dots call stopPropagation so they don't reach this handler.
  const handleBgTap = () => {
    if (freeDose !== null) {
      setFreeDose(null);
    }
  };
  const [hour12, setHour12] = useState(true);
  const svgRef = useRef(null);

  const size = 440;
  const center = size / 2;
  const outerR = 150;
  const innerR = 110;
  const tickOuter = 148;
  const tickInner = 138;
  const labelR = 174;

  const DAY_START = 6;
  const DAY_END = 18;

  // Distribute medications across the colored band:
  // 1 med → centered. 2 meds → outer + inner. 3 meds → outer, middle, inner. 4+ → evenly spaced.
  const computeRingRadii = (count) => {
    const bandOuter = 145; // just inside outerR (150)
    const bandInner = 115; // just outside innerR (110)
    const bandCenter = (bandOuter + bandInner) / 2;
    if (count <= 1) return [bandCenter];
    if (count === 2) return [bandOuter, bandInner];
    if (count === 3) return [bandOuter, bandCenter, bandInner];
    // 4+ evenly spaced from outer to inner
    const step = (bandOuter - bandInner) / (count - 1);
    return Array.from({ length: count }, (_, i) => bandOuter - i * step);
  };
  const ringRadii = computeRingRadii(meds.length);

  const hourToAngle = (h) => (h / 24) * 2 * Math.PI - Math.PI / 2;

  const arcPath = (hStart, hEnd, rOuter, rInner) => {
    const a1 = hourToAngle(hStart);
    const a2 = hourToAngle(hEnd);
    const x1o = center + rOuter * Math.cos(a1);
    const y1o = center + rOuter * Math.sin(a1);
    const x2o = center + rOuter * Math.cos(a2);
    const y2o = center + rOuter * Math.sin(a2);
    const x1i = center + rInner * Math.cos(a1);
    const y1i = center + rInner * Math.sin(a1);
    const x2i = center + rInner * Math.cos(a2);
    const y2i = center + rInner * Math.sin(a2);
    const sweep = hEnd - hStart;
    const largeArc = sweep > 12 ? 1 : 0;
    return `M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
  };

  const pointerToHours = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = rect.width / size;
    const x = clientX - rect.left - center * scale;
    const y = clientY - rect.top - center * scale;
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    return (angle / (2 * Math.PI)) * 24;
  };

  const updateMed = (id, patch) => {
    setMeds((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        // If count changed, reset doseOffsets to the new length
        if (patch.count !== undefined && patch.count !== m.count) {
          next.doseOffsets = new Array(patch.count).fill(0);
        }
        // Ensure doseOffsets exists and matches count (for legacy restored meds)
        if (!Array.isArray(next.doseOffsets) || next.doseOffsets.length !== next.count) {
          next.doseOffsets = new Array(next.count).fill(0);
        }
        return next;
      })
    );
  };

  // Compute the constraint window for a single dose's drift in free mode.
  // The dose's drift δ_i is constrained by both adjacent gaps:
  //   gap_before = spacing + δ_i - δ_(i-1) ∈ [spacing*(1-tol), spacing*(1+tol)]
  //   gap_after  = spacing + δ_(i+1) - δ_i ∈ [spacing*(1-tol), spacing*(1+tol)]
  // (with wraparound — the gap from last dose back to first counts too)
  // Returns { min, max } drift bounds for δ_i in hours.
  const getDriftBounds = (med, i) => {
    const spacing = 24 / med.count;
    const tol = GAP_TOLERANCE * spacing;
    const offsets = med.doseOffsets || new Array(med.count).fill(0);
    const n = med.count;
    if (n === 1) {
      // Single dose: no gap constraint (wrap-around to itself is 24h regardless)
      return { min: -tol, max: tol };
    }
    const prev = offsets[(i - 1 + n) % n] || 0;
    const next = offsets[(i + 1) % n] || 0;
    // gap_before = spacing + δ_i - prev must be in [spacing-tol, spacing+tol]
    //   → δ_i ∈ [prev - tol, prev + tol]
    // gap_after = spacing + next - δ_i must be in [spacing-tol, spacing+tol]
    //   → δ_i ∈ [next - tol, next + tol]
    const minA = prev - tol;
    const maxA = prev + tol;
    const minB = next - tol;
    const maxB = next + tol;
    return {
      min: Math.max(minA, minB),
      max: Math.min(maxA, maxB),
    };
  };

  const startDragForMed = (medId, doseIndex) => (e) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const last = lastTapRef.current;
    const isDoubleTap =
      last.medId === medId &&
      last.doseIndex === doseIndex &&
      now - last.time < 350;
    lastTapRef.current = { medId, doseIndex, time: now };

    const med = meds.find((m) => m.id === medId);
    if (!med) return;

    if (isDoubleTap) {
      // Enter free mode for this specific dose
      setFreeDose({ medId, doseIndex });
      setDragging(medId);
      // Don't update offset on the tap itself — wait for actual drag movement
      return;
    }

    // Schedule-mode drag: dragging anywhere clears any previously-set free mode
    // unless we're dragging the same dose that's already in free mode.
    const stillFree =
      freeDose && freeDose.medId === medId && freeDose.doseIndex === doseIndex;
    if (!stillFree && freeDose !== null) {
      setFreeDose(null);
    }

    setDragging(medId);
    const point = e.touches ? e.touches[0] : e;
    const h = pointerToHours(point.clientX, point.clientY);

    if (stillFree) {
      // Continue free-mode drag: update only this dose's offset
      applyFreeDoseDrag(med, doseIndex, h);
    } else {
      // Whole-schedule drag: align nearest dose to pointer
      applyScheduleDrag(med, h);
    }
  };

  // Update the schedule offset so the dose nearest the pointer lands at it
  const applyScheduleDrag = (med, h) => {
    const spacing = 24 / med.count;
    const offsets = med.doseOffsets || new Array(med.count).fill(0);
    // Find which dose the pointer is closest to (accounting for current drift)
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < med.count; i++) {
      const doseH = (i * spacing + med.offset + (offsets[i] || 0)) % 24;
      let d = Math.abs(doseH - h);
      d = Math.min(d, 24 - d); // wrap-aware distance
      if (d < bestDist) {
        bestDist = d;
        bestI = i;
      }
    }
    // We want this dose to land at h: i*spacing + newOffset + drift = h
    let newOffset = h - bestI * spacing - (offsets[bestI] || 0);
    newOffset = ((newOffset % 24) + 24) % 24;
    newOffset = Math.round(newOffset * 12) / 12;
    if (newOffset >= 24) newOffset -= 24;
    updateMed(med.id, { offset: newOffset });
  };

  // Update a single dose's drift, clamped to ±20% gap constraint
  const applyFreeDoseDrag = (med, doseIndex, h) => {
    const spacing = 24 / med.count;
    const offsets = med.doseOffsets || new Array(med.count).fill(0);
    // Desired drift = pointer hour - scheduled time of this dose
    let desiredH = h - (doseIndex * spacing + med.offset);
    // Wrap to [-12, 12] so we pick the shortest path
    desiredH = ((desiredH + 12) % 24 + 24) % 24 - 12;

    // Snap to 5-min increments
    desiredH = Math.round(desiredH * 12) / 12;

    // Clamp to gap bounds
    const { min, max } = getDriftBounds(med, doseIndex);
    const clamped = Math.max(min, Math.min(max, desiredH));

    const newOffsets = [...offsets];
    newOffsets[doseIndex] = clamped;
    updateMed(med.id, { doseOffsets: newOffsets });
  };

  useEffect(() => {
    if (dragging == null) return;
    const move = (e) => {
      const point = e.touches ? e.touches[0] : e;
      const h = pointerToHours(point.clientX, point.clientY);
      const med = meds.find((m) => m.id === dragging);
      if (!med) return;
      if (freeDose && freeDose.medId === dragging) {
        applyFreeDoseDrag(med, freeDose.doseIndex, h);
      } else {
        // Whole schedule drag — keep the same dose under the pointer
        // We don't re-pick which dose is "anchor"; just shift offset so pointer tracks.
        const spacing = 24 / med.count;
        const nearest = Math.round(h / spacing) * spacing;
        let newOffset = ((h - nearest) % 24 + 24) % 24;
        newOffset = Math.round(newOffset * 12) / 12;
        if (newOffset >= 24) newOffset -= 24;
        updateMed(dragging, { offset: newOffset });
      }
    };
    const end = () => setDragging(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [dragging, freeDose, meds]);

  // Compute doses for each med
  const medDoses = meds.map((med, idx) => {
    const spacing = 24 / med.count;
    const r = ringRadii[idx];
    const offsets = med.doseOffsets || new Array(med.count).fill(0);
    const doses = Array.from({ length: med.count }, (_, i) => {
      const driftedH = i * spacing + med.offset + (offsets[i] || 0);
      // Snap to 5-min increments to absorb floating-point drift from spacing math
      const snapped = Math.round(driftedH * 12) / 12;
      const h = ((snapped % 24) + 24) % 24;
      const a = hourToAngle(h);
      return {
        h,
        doseIndex: i,
        x: center + r * Math.cos(a),
        y: center + r * Math.sin(a),
        isDay: h >= DAY_START && h < DAY_END,
      };
    }).sort((a, b) => a.h - b.h);
    return { med, doses, ringR: r, spacing };
  });

  const hourLabels = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (h) => {
    let hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    let m = mins;
    if (m === 60) {
      hours = (hours + 1) % 24;
      m = 0;
    }
    if (hour12) {
      const suffix = hours < 12 ? "AM" : "PM";
      let h12 = hours % 12;
      if (h12 === 0) h12 = 12;
      const time = `${h12}:${m.toString().padStart(2, "0")}`;
      return (
        <>
          {time}<span style={{ marginLeft: "2px" }}>{suffix}</span>
        </>
      );
    }
    return `${hours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const formatSpacing = (spacing) => {
    const hours = Math.floor(spacing);
    const mins = Math.round((spacing - hours) * 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Plain-text version of formatHour for the summary
  const formatHourText = (h) => {
    let hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    let m = mins;
    if (m === 60) {
      hours = (hours + 1) % 24;
      m = 0;
    }
    if (hour12) {
      const suffix = hours < 12 ? "AM" : "PM";
      let h12 = hours % 12;
      if (h12 === 0) h12 = 12;
      return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
    }
    return `${hours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Encode meds to a compact hash for restoration. Each med = "name|count|offset|colorIdx"
  const encodeHash = () => {
    const data = meds.map((m) => {
      const colorIdx = MED_COLORS.findIndex((c) => c.name === m.color.name);
      const offsets = (m.doseOffsets || new Array(m.count).fill(0))
        .map((d) => Math.round((d || 0) * 60) / 60);
      return [m.name, m.count, Math.round(m.offset * 60) / 60, colorIdx, offsets];
    });
    const json = JSON.stringify(data);
    // URL-safe base64: replace +,/ with -,_ and strip = padding so it can live cleanly in a URL.
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const decodeHash = (hash) => {
    try {
      let s = hash.trim();
      // Convert URL-safe base64 back to standard base64 and re-pad
      s = s.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const json = decodeURIComponent(escape(atob(s)));
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return null;
      return data.map(([name, count, offset, colorIdx, doseOffsets], i) => {
        const c = Math.max(1, Math.min(24, parseInt(count, 10) || 3));
        const offsets = Array.isArray(doseOffsets) && doseOffsets.length === c
          ? doseOffsets.map((d) => Number(d) || 0)
          : new Array(c).fill(0);
        return {
          id: nextId++,
          name: typeof name === "string" ? name : `Medication ${i + 1}`,
          count: c,
          offset: ((Number(offset) || 0) % 24 + 24) % 24,
          color: MED_COLORS[colorIdx] || MED_COLORS[i % MED_COLORS.length],
          doseOffsets: offsets,
        };
      });
    } catch {
      return null;
    }
  };

  // On first mount, check if the URL has a schedule encoded in the hash fragment.
  // Format: https://rxwheel.com/#code=<base64hash>
  // Backward compatible with a raw hash too: https://rxwheel.com/#<base64hash>
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const raw = window.location.hash.slice(1); // strip leading '#'
    let candidate = raw;
    if (raw.startsWith("code=")) candidate = raw.slice(5);
    if (!candidate) return;
    const restored = decodeHash(candidate);
    if (restored && restored.length > 0) {
      setMeds(restored);
      // Clear the hash so refreshing/sharing this URL again is clean,
      // and so the user can edit without the URL drifting back to the loaded version.
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleHash = encodeHash();
  // Build a shareable URL with the schedule encoded in the URL hash fragment.
  // If the user is on a known host, use that; otherwise fall back to rxwheel.com.
  const shareUrl = (() => {
    if (typeof window !== "undefined" && window.location && window.location.host) {
      return `${window.location.origin}/#code=${scheduleHash}`;
    }
    return `https://rxwheel.com/#code=${scheduleHash}`;
  })();

  // Build the schedule summary text (with shareable link at the end)
  const summaryText = "Your medication schedule made with RXwheel.com\n\n" + medDoses
    .map(({ med, doses, spacing }) => {
      const times = doses.map((d) => formatHourText(d.h)).join(", ");
      return `${med.name}\n  ${med.count}× per day, every ${formatSpacing(spacing)}\n  Times: ${times}`;
    })
    .join("\n\n") + `\n\n— Open or edit this schedule —\n${shareUrl}`;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      const ta = document.getElementById("schedule-summary");
      if (ta) {
        ta.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    }
  };

  // Generate an ICS file containing all dose events as daily-recurring events
  const handleDownloadIcs = () => {
    // Pad helper
    const pad = (n) => n.toString().padStart(2, "0");

    // Use today as the start date for recurring events
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const startDate = `${yyyy}${mm}${dd}`;

    // Stamp for DTSTAMP (UTC)
    const stamp =
      now.getUTCFullYear().toString() +
      pad(now.getUTCMonth() + 1) +
      pad(now.getUTCDate()) + "T" +
      pad(now.getUTCHours()) +
      pad(now.getUTCMinutes()) +
      pad(now.getUTCSeconds()) + "Z";

    // Get user's local timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//RX Wheel//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    medDoses.forEach(({ med, doses }) => {
      doses.forEach((d, i) => {
        const hh = Math.floor(d.h);
        const mins = Math.round((d.h - hh) * 60);
        const adjustedH = mins === 60 ? (hh + 1) % 24 : hh;
        const adjustedM = mins === 60 ? 0 : mins;
        const dtStart = `${startDate}T${pad(adjustedH)}${pad(adjustedM)}00`;
        // 5 minute event duration
        const endMinutes = adjustedM + 5;
        const endH = endMinutes >= 60 ? (adjustedH + 1) % 24 : adjustedH;
        const endM = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
        const dtEnd = `${startDate}T${pad(endH)}${pad(endM)}00`;
        const uid = `rxwheel-${med.id}-${i}-${Date.now()}@rxwheel`;
        const safeName = (med.name || "Medication").replace(/[\\,;]/g, " ");

        lines.push(
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=${tz}:${dtStart}`,
          `DTEND;TZID=${tz}:${dtEnd}`,
          "RRULE:FREQ=DAILY",
          `SUMMARY:Take ${safeName}`,
          `DESCRIPTION:RX Wheel scheduled dose`,
          "BEGIN:VALARM",
          "TRIGGER:-PT0M",
          "ACTION:DISPLAY",
          `DESCRIPTION:Take ${safeName}`,
          "END:VALARM",
          "END:VEVENT"
        );
      });
    });

    lines.push("END:VCALENDAR");
    const ics = lines.join("\r\n");

    // Try multiple download approaches for sandboxed/iOS environments
    const filename = "rx-wheel-schedule.ics";

    // Approach 1: Blob URL with anchor click
    try {
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    } catch (err) {
      console.warn("Blob download failed, trying data URL", err);
    }

    // Approach 2: data URL fallback
    try {
      const dataUrl = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
      const w = window.open(dataUrl, "_blank");
      if (!w) {
        // Approach 3: location replace (last resort)
        window.location.href = dataUrl;
      }
    } catch (err) {
      alert("Could not generate calendar file. Try copying the schedule instead.");
    }
  };

  const addMed = () => {
    if (meds.length >= MED_COLORS.length) return;
    setMeds((prev) => {
      // pick the first color not currently in use
      const used = new Set(prev.map((m) => m.color.name));
      const color = MED_COLORS.find((c) => !used.has(c.name)) || MED_COLORS[prev.length];
      return [...prev, { id: nextId++, count: 3, offset: 8 + prev.length * 1.5, color, name: `Medication ${prev.length + 1}`, doseOffsets: [0, 0, 0] }];
    });
  };

  const removeMed = (id) => {
    setMeds((prev) => prev.filter((m) => m.id !== id));
  };

  // ---- Sleep optimization helpers ----
  const SLEEP_START = 23; // 11 PM — hard sleep starts here (after 11:00)
  const SLEEP_END = 5;    // 5 AM — hard sleep ends here (before 5:00)
  const BUFFER_START = 22; // 10 PM — soft sleep zone is (22, 23]
  const BUFFER_END = 6;    // 6 AM — soft sleep zone is [5, 6)
  const SNAP_BUCKET = 1 / 12; // 5 minutes in hours

  // Returns sleep weight for a given hour:
  //   1.0 = hard sleep (11 PM – 5 AM)
  //   0.5 = buffer zone (10–11 PM and 5–6 AM)
  //   0.0 = fully awake
  const sleepWeight = (h) => {
    if (h > SLEEP_START || h < SLEEP_END) return 1.0; // hard sleep
    if ((h > BUFFER_START && h <= SLEEP_START) ||
        (h >= SLEEP_END && h < BUFFER_END)) return 0.5; // buffer
    return 0;
  };

  // Backward compatibility wrappers (used in legacy paths)
  const isInSleep = (h) => sleepWeight(h) > 0;

  // For a dose hour, how "deep" into sleep it is. 0 if awake.
  const sleepDepth = (h) => {
    const w = sleepWeight(h);
    if (w === 0) return 0;
    const distA = h > BUFFER_START ? (24 - h) + BUFFER_END : BUFFER_END - h;
    const distB = h > BUFFER_START ? h - BUFFER_START : (24 - BUFFER_START) + h;
    return Math.min(distA, distB);
  };

  // Bucket a dose hour to a 5-minute slot index (0..287). Used to count distinct times.
  const bucket = (h) => Math.round(h / SNAP_BUCKET) % 288;

  // Compute the dose hours for a med given offset and per-dose drift
  const getDoseHours = (med, offset, doseOffsets) => {
    const spacing = 24 / med.count;
    const offsets = doseOffsets || new Array(med.count).fill(0);
    return Array.from({ length: med.count }, (_, i) => {
      const h = (i * spacing + offset + (offsets[i] || 0)) % 24;
      return ((h % 24) + 24) % 24;
    });
  };

  // Score a combined schedule: returns {sleepCount, distinctTimes, sleepDepthSum}
  // sleepCount and sleepDepthSum are weighted by sleepWeight (1.0 hard, 0.5 buffer).
  const scoreSchedule = (medsArr, offsets, perDoseOffsets) => {
    const buckets = new Set();
    let sleepCount = 0;
    let depthSum = 0;
    for (let mi = 0; mi < medsArr.length; mi++) {
      const m = medsArr[mi];
      const hours = getDoseHours(m, offsets[mi], perDoseOffsets[mi]);
      for (const h of hours) {
        buckets.add(bucket(h));
        const w = sleepWeight(h);
        if (w > 0) {
          sleepCount += w;
          depthSum += w * sleepDepth(h);
        }
      }
    }
    return { sleepCount, distinctTimes: buckets.size, sleepDepthSum: depthSum };
  };

  // Find candidate offsets for a single medication, ranked by how achievable a
  // sleep-free schedule is with per-dose drift available.
  const findCandidateOffsets = (med, topN = 4, tolerance = GAP_TOLERANCE) => {
    const spacing = 24 / med.count;
    const driftBudget = tolerance * spacing; // hours
    const candidates = [];
    for (let step = 0; step < spacing * 12; step++) {
      const candidate = step / 12;
      const hours = getDoseHours(med, candidate, null);
      let sleepCount = 0;       // weighted sleep total (no drift)
      let unfixableCount = 0;   // hard-sleep doses that drift can't escape
      let depthSum = 0;
      for (const h of hours) {
        const w = sleepWeight(h);
        if (w > 0) {
          sleepCount += w;
          const depth = sleepDepth(h);
          depthSum += w * depth;
          // Only count as "unfixable" if it's in HARD sleep AND too deep for drift.
          // Buffer zone is acceptable as a fallback so we don't penalize candidates
          // whose only sleep dose is in the buffer.
          if (w === 1.0 && depth > driftBudget) unfixableCount++;
        }
      }
      candidates.push({ offset: candidate, sleepCount, unfixableCount, depthSum });
    }
    // Sort: prioritize fewest unfixable (drift can't help), then total sleep count, then total depth
    candidates.sort((a, b) => {
      if (a.unfixableCount !== b.unfixableCount) return a.unfixableCount - b.unfixableCount;
      if (a.sleepCount !== b.sleepCount) return a.sleepCount - b.sleepCount;
      return a.depthSum - b.depthSum;
    });
    return candidates.slice(0, topN).map((c) => c.offset);
  };

  // Compare two schedule scores: lower is better
  // Priority: sleepCount → distinctTimes → sleepDepthSum
  const compareScores = (a, b) => {
    if (a.sleepCount !== b.sleepCount) return a.sleepCount - b.sleepCount;
    if (a.distinctTimes !== b.distinctTimes) return a.distinctTimes - b.distinctTimes;
    return a.sleepDepthSum - b.sleepDepthSum;
  };

  // Compute drift bounds given the *fixed* gap constraint (used during search)
  const driftBoundsFor = (med, i, currentOffsets) => {
    const spacing = 24 / med.count;
    const tol = GAP_TOLERANCE * spacing;
    const n = med.count;
    if (n === 1) return { min: -tol, max: tol };
    const prev = currentOffsets[(i - 1 + n) % n] || 0;
    const next = currentOffsets[(i + 1) % n] || 0;
    return {
      min: Math.max(prev - tol, next - tol),
      max: Math.min(prev + tol, next + tol),
    };
  };

  // Basic Optimize: same algorithm as Super, but with a tighter ±10% gap tolerance
  const optimizeForSleep = () => {
    runSleepOptimizer(0.10);
  };

  // Super Optimize: full ±20% per-gap drift allowed
  const superOptimizeForSleep = () => {
    runSleepOptimizer(GAP_TOLERANCE);
  };

  // Shared optimizer: combinatorial offset search + per-dose drift + pair-meet clustering.
  // `tolerance` is the per-gap drift fraction (0.10 for basic, 0.20 for super).
  const runSleepOptimizer = (tolerance) => {
    setFreeDose(null);

    setMeds((prev) => {
      if (prev.length === 0) return prev;

      // Phase 1: get top candidate offsets per med
      const candidatesPerMed = prev.map((m) => findCandidateOffsets(m, 4, tolerance));

      // Phase 2: search combinations to find best base offsets
      // For each med, try each candidate; pick the combination with best score
      const cap = candidatesPerMed.reduce((acc, arr) => acc * arr.length, 1);
      // Safety cap on combinations
      const MAX_COMBOS = 1500;

      let bestOffsets = candidatesPerMed.map((arr) => arr[0]);
      let bestScore = scoreSchedule(
        prev,
        bestOffsets,
        prev.map((m) => new Array(m.count).fill(0))
      );

      if (cap <= MAX_COMBOS) {
        // Enumerate all combinations
        const indices = new Array(prev.length).fill(0);
        let done = false;
        while (!done) {
          const offs = indices.map((idx, mi) => candidatesPerMed[mi][idx]);
          const score = scoreSchedule(
            prev,
            offs,
            prev.map((m) => new Array(m.count).fill(0))
          );
          if (compareScores(score, bestScore) < 0) {
            bestScore = score;
            bestOffsets = offs;
          }
          // increment combo
          let k = prev.length - 1;
          while (k >= 0) {
            indices[k]++;
            if (indices[k] < candidatesPerMed[k].length) break;
            indices[k] = 0;
            k--;
          }
          if (k < 0) done = true;
        }
      }

      // Phase 3: per-dose drift to cluster doses (integer 5-min slot arithmetic)
      // Slot = integer 0..287 representing a 5-minute bucket of the day.
      // 12 slots per hour, 288 total.
      const SLOTS = 288;
      const SLOTS_PER_HOUR = 12;
      // Returns sleep weight for a slot:
      //   1.0 = hard sleep (11 PM – 5 AM)
      //   0.5 = buffer zone (10–11 PM, 5–6 AM)
      //   0.0 = awake
      const slotSleepWeight = (slot) => {
        const h = slot / SLOTS_PER_HOUR;
        if (h > SLEEP_START || h < SLEEP_END) return 1.0;
        if ((h > BUFFER_START && h <= SLEEP_START) ||
            (h >= SLEEP_END && h < BUFFER_END)) return 0.5;
        return 0;
      };
      const slotInSleep = (slot) => slotSleepWeight(slot) > 0;
      const slotSleepDepth = (slot) => {
        if (!slotInSleep(slot)) return 0;
        const h = slot / SLOTS_PER_HOUR;
        const distA = h > BUFFER_START ? (24 - h) + BUFFER_END : BUFFER_END - h;
        const distB = h > BUFFER_START ? h - BUFFER_START : (24 - BUFFER_START) + h;
        return Math.min(distA, distB);
      };

      // Convert offsets from hours to integer slot offsets
      const baseOffsetSlots = bestOffsets.map((o) => Math.round(o * SLOTS_PER_HOUR));
      const driftSlots = prev.map((m) => new Array(m.count).fill(0)); // each dose's drift in slot units

      const driftBoundsSlots = (medIdx, doseIdx) => {
        const m = prev[medIdx];
        const n = m.count;
        const spacing = 24 / n;
        const tolSlots = Math.floor(tolerance * spacing * SLOTS_PER_HOUR);
        if (n === 1) return { min: -tolSlots, max: tolSlots };
        const dArr = driftSlots[medIdx];
        const prevDrift = dArr[(doseIdx - 1 + n) % n] || 0;
        const nextDrift = dArr[(doseIdx + 1) % n] || 0;
        return {
          min: Math.max(prevDrift - tolSlots, nextDrift - tolSlots),
          max: Math.min(prevDrift + tolSlots, nextDrift + tolSlots),
        };
      };

      const computeSlot = (medIdx, doseIdx) => {
        const m = prev[medIdx];
        const spacing = 24 / m.count;
        const baseSlot = Math.round(doseIdx * spacing * SLOTS_PER_HOUR) + baseOffsetSlots[medIdx];
        const slot = ((baseSlot + driftSlots[medIdx][doseIdx]) % SLOTS + SLOTS) % SLOTS;
        return slot;
      };

      // Score a candidate slot for dose (mi, di) given current schedule.
      // Insight: sleep penalty is per "trip to the medicine cabinet" — if another
      // dose is already at this slot, joining it adds no new sleep cost.
      const scoreSlot = (slot, mi, di) => {
        let score = 0;

        // Check whether any other dose is already in this exact slot (joining = free)
        let alreadyOccupied = false;
        for (let omi = 0; omi < prev.length && !alreadyOccupied; omi++) {
          for (let odi = 0; odi < prev[omi].count && !alreadyOccupied; odi++) {
            if (omi === mi && odi === di) continue;
            if (computeSlot(omi, odi) === slot) alreadyOccupied = true;
          }
        }

        const w = slotSleepWeight(slot);
        if (w > 0 && !alreadyOccupied) {
          // Pay the sleep penalty only if we'd be the first/only dose at this time.
          score += w * (100000 + slotSleepDepth(slot) * 1000);
        }

        // Clustering bonus: reward proximity to other doses with graduated bonus
        for (let omi = 0; omi < prev.length; omi++) {
          for (let odi = 0; odi < prev[omi].count; odi++) {
            if (omi === mi && odi === di) continue;
            const oslot = computeSlot(omi, odi);
            const dist = Math.min(
              Math.abs(oslot - slot),
              SLOTS - Math.abs(oslot - slot)
            );
            // Big reward for exact match (same 5-min slot)
            if (dist === 0) score -= 500;
            // Graduated reward up to 12 slots (1 hour) away
            else if (dist <= 12) score -= Math.round((13 - dist) * 8);
          }
        }
        return score;
      };

      // Helper: get the reachable slot range for a given dose, considering current state.
      const reachableSlotRange = (mi, di) => {
        const m = prev[mi];
        const spacing = 24 / m.count;
        const baseSlot =
          Math.round(di * spacing * SLOTS_PER_HOUR) + baseOffsetSlots[mi];
        const { min, max } = driftBoundsSlots(mi, di);
        return { baseSlot, min, max };
      };

      // Compute the total schedule score (used for accept/reject of pair moves)
      const totalScore = () => {
        let total = 0;
        for (let mi = 0; mi < prev.length; mi++) {
          for (let di = 0; di < prev[mi].count; di++) {
            const slot = computeSlot(mi, di);
            total += scoreSlot(slot, mi, di);
          }
        }
        return total;
      };

      // Phase 3a: Pair-meet pass.
      // For every pair of doses from different medications, see if both can drift
      // to a common slot. If clustering them improves the total score, apply.
      const tryPairMeet = () => {
        for (let mi1 = 0; mi1 < prev.length; mi1++) {
          for (let di1 = 0; di1 < prev[mi1].count; di1++) {
            for (let mi2 = mi1 + 1; mi2 < prev.length; mi2++) {
              for (let di2 = 0; di2 < prev[mi2].count; di2++) {
                const r1 = reachableSlotRange(mi1, di1);
                const r2 = reachableSlotRange(mi2, di2);

                // Save current drifts to restore on reject
                const savedD1 = driftSlots[mi1][di1];
                const savedD2 = driftSlots[mi2][di2];
                const baselineScore = totalScore();

                let bestPairScore = baselineScore;
                let bestD1 = savedD1;
                let bestD2 = savedD2;

                // Iterate every slot dose 1 can reach. For each, check if dose 2
                // can also reach it (mod SLOTS), and if so try aligning there.
                for (let d1 = r1.min; d1 <= r1.max; d1++) {
                  const targetSlot = ((r1.baseSlot + d1) % SLOTS + SLOTS) % SLOTS;
                  // What drift does dose 2 need to land at targetSlot?
                  // Try the drift in the range [-(SLOTS/2), SLOTS/2) closest to 0.
                  let d2 = targetSlot - r2.baseSlot;
                  // Normalize to nearest representation
                  while (d2 > SLOTS / 2) d2 -= SLOTS;
                  while (d2 < -SLOTS / 2) d2 += SLOTS;
                  if (d2 < r2.min || d2 > r2.max) continue;

                  driftSlots[mi1][di1] = d1;
                  driftSlots[mi2][di2] = d2;
                  const s = totalScore();
                  if (s < bestPairScore) {
                    bestPairScore = s;
                    bestD1 = d1;
                    bestD2 = d2;
                  }
                }

                driftSlots[mi1][di1] = bestD1;
                driftSlots[mi2][di2] = bestD2;
              }
            }
          }
        }
      };

      // Run multiple passes alternating direction so doses can pull each other into clusters.
      for (let pass = 0; pass < 6; pass++) {
        const reverse = pass % 2 === 1;
        const medOrder = reverse
          ? [...prev.keys()].reverse()
          : [...prev.keys()];
        for (const mi of medOrder) {
          const m = prev[mi];
          const doseOrder = reverse
            ? [...Array(m.count).keys()].reverse()
            : [...Array(m.count).keys()];
          for (const di of doseOrder) {
            const { min, max } = driftBoundsSlots(mi, di);
            const spacing = 24 / m.count;
            const baseSlot =
              Math.round(di * spacing * SLOTS_PER_HOUR) + baseOffsetSlots[mi];

            let bestDrift = driftSlots[mi][di];
            const currentSlot = ((baseSlot + bestDrift) % SLOTS + SLOTS) % SLOTS;
            let bestScore = scoreSlot(currentSlot, mi, di);

            for (let d = min; d <= max; d++) {
              const candSlot = ((baseSlot + d) % SLOTS + SLOTS) % SLOTS;
              const s = scoreSlot(candSlot, mi, di);
              if (s < bestScore) {
                bestScore = s;
                bestDrift = d;
              }
            }
            driftSlots[mi][di] = bestDrift;
          }
        }
        // After each pass, do a pair-meet round to find cluster opportunities
        // that single-dose moves can't see.
        tryPairMeet();
      }

      // Convert slot drifts back to hours
      const perDoseOffsets = driftSlots.map((arr) =>
        arr.map((s) => s / SLOTS_PER_HOUR)
      );

      return prev.map((m, mi) => ({
        ...m,
        offset: baseOffsetSlots[mi] / SLOTS_PER_HOUR,
        doseOffsets: perDoseOffsets[mi],
      }));
    });
  };

  return (
    <div className="relative flex flex-col items-center min-h-screen bg-slate-950 text-slate-100 pt-16 pb-6 px-3 select-none">
      {/* Top-right sliding 12/24h toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className={`text-xs font-semibold transition-colors ${hour12 ? "text-emerald-400" : "text-slate-500"}`}>
          12h
        </span>
        <button
          onClick={() => setHour12(!hour12)}
          aria-label="Toggle 12 or 24 hour time"
          role="switch"
          aria-checked={hour12}
          className="relative bg-slate-700 rounded-full h-7 w-12 shadow-inner"
        >
          <span
            className="absolute top-0.5 h-6 w-6 rounded-full bg-emerald-500 shadow transition-all duration-200 ease-out"
            style={hour12 ? { left: "2px" } : { left: "calc(100% - 26px)" }}
          />
        </button>
        <span className={`text-xs font-semibold transition-colors ${!hour12 ? "text-emerald-400" : "text-slate-500"}`}>
          24h
        </span>
      </div>

      {/* RX Wheel logo */}
      <img
        src="data:image/png;base64,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"
        alt="RX Wheel"
        className="h-24 md:h-36 w-auto mb-2"
      />
      <p className="text-xs text-slate-400 mb-4">Drag a dose to shift the schedule</p>

      <div className="mb-4 w-full max-w-[400px] px-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          className="touch-none w-full h-auto"
          onMouseDown={handleBgTap}
          onTouchStart={handleBgTap}
        >
          <defs>
            <radialGradient
              id="dayGrad"
              gradientUnits="userSpaceOnUse"
              cx={center}
              cy={center}
              r={outerR}
            >
              <stop offset={innerR / outerR} stopColor="#fbbf24" stopOpacity="0" />
              <stop offset={130 / outerR} stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="1" stopColor="#f59e0b" stopOpacity="1" />
            </radialGradient>
            <radialGradient
              id="nightGrad"
              gradientUnits="userSpaceOnUse"
              cx={center}
              cy={center}
              r={outerR}
            >
              <stop offset={innerR / outerR} stopColor="#312e81" stopOpacity="0" />
              <stop offset={130 / outerR} stopColor="#1e1b4b" stopOpacity="1" />
              <stop offset="1" stopColor="#1e1b4b" stopOpacity="1" />
            </radialGradient>
          </defs>

          <path d={arcPath(DAY_END, DAY_START + 24, outerR, innerR)} fill="url(#nightGrad)" />
          <path d={arcPath(DAY_START, DAY_END, outerR, innerR)} fill="url(#dayGrad)" />

          {/* Outer border arcs (day and night colored) */}
          {(() => {
            const r = outerR;
            const aDayStart = hourToAngle(DAY_START);
            const aDayEnd = hourToAngle(DAY_END);
            const dayPath = `M ${center + r * Math.cos(aDayStart)} ${center + r * Math.sin(aDayStart)} A ${r} ${r} 0 0 1 ${center + r * Math.cos(aDayEnd)} ${center + r * Math.sin(aDayEnd)}`;
            const nightPath = `M ${center + r * Math.cos(aDayEnd)} ${center + r * Math.sin(aDayEnd)} A ${r} ${r} 0 0 1 ${center + r * Math.cos(aDayStart)} ${center + r * Math.sin(aDayStart)}`;
            return (
              <>
                <path d={dayPath} fill="none" stroke="#fcd34d" strokeWidth="3" strokeLinecap="butt" />
                <path d={nightPath} fill="none" stroke="#312e81" strokeWidth="3" strokeLinecap="butt" />
              </>
            );
          })()}

          {/* Hour ticks (always shown, except at 6 AM / 6 PM boundaries) */}
          {hourLabels.map((h) => {
            if (h === DAY_START || h === DAY_END) return null;
            const a = hourToAngle(h);
            const isMajor = h % 6 === 0;
            const isDay = h >= DAY_START && h <= DAY_END;
            const x1 = center + tickInner * Math.cos(a);
            const y1 = center + tickInner * Math.sin(a);
            const x2 = center + tickOuter * Math.cos(a);
            const y2 = center + tickOuter * Math.sin(a);
            return (
              <line
                key={`tick-${h}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isDay ? "#78350f" : "#a5b4fc"}
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 0.9 : 0.5}
              />
            );
          })}

          {/* Inner labels: 24h numbers when in 12h mode, AM/PM when in 24h mode */}
          {hourLabels.map((h) => {
            const a = hourToAngle(h);
            const isMajor = h % 6 === 0;
            const lx = center + (innerR - 14) * Math.cos(a);
            const ly = center + (innerR - 14) * Math.sin(a);
            let label;
            if (hour12) {
              label = h === 0 ? 24 : h;
            } else {
              if (h === 0) label = "12a";
              else if (h === 12) label = "12p";
              else if (h < 12) label = `${h}a`;
              else label = `${h - 12}p`;
            }
            return (
              <text
                key={`inner-${h}`}
                x={lx} y={ly}
                fill={isMajor ? "#e2e8f0" : "#94a3b8"}
                fontSize={isMajor ? 13 : 10}
                fontWeight={isMajor ? 600 : 400}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            );
          })}

          {/* Outer labels: AM/PM when in 12h mode, 24h numbers when in 24h mode */}
          {hourLabels.map((h) => {
            const a = hourToAngle(h);
            const x = center + labelR * Math.cos(a);
            const y = center + labelR * Math.sin(a);
            const isDayLabel = h > DAY_START && h < DAY_END;
            let label;
            if (hour12) {
              if (h === 0) label = "12\u2009AM";
              else if (h === 12) label = "12\u2009PM";
              else if (h < 12) label = `${h}\u2009AM`;
              else label = `${h - 12}\u2009PM`;
            } else {
              label = h === 0 ? "24" : h.toString();
            }
            const isMajor = h % 3 === 0;
            return (
              <text
                key={`outer-${h}`}
                x={x} y={y}
                fill={isDayLabel ? "#fbbf24" : "#a5b4fc"}
                fontSize={hour12 ? (isMajor ? 14 : 12) : (isMajor ? 18 : 16)}
                fontWeight={isMajor ? 700 : 500}
                opacity={isMajor ? 1 : 0.9}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            );
          })}

          {/* Pill image at center */}
          <image
            href="data:image/png;base64,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"
            x={center - 35}
            y={center - 36}
            width="70"
            height="72"
            preserveAspectRatio="xMidYMid meet"
          />

          {/* Faint guide ring per medication */}
          {medDoses.map(({ med, ringR }) => (
            <circle
              key={`guide-${med.id}`}
              cx={center} cy={center} r={ringR}
              fill="none"
              stroke={med.color.dot}
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity="0.25"
            />
          ))}

          {/* Dots per medication */}
          {medDoses.map(({ med, doses }) =>
            doses.map((d) => {
              const isFree =
                freeDose &&
                freeDose.medId === med.id &&
                freeDose.doseIndex === d.doseIndex;
              return (
                <g
                  key={`${med.id}-${d.doseIndex}`}
                  onMouseDown={startDragForMed(med.id, d.doseIndex)}
                  onTouchStart={startDragForMed(med.id, d.doseIndex)}
                  style={{ cursor: dragging === med.id ? "grabbing" : "grab" }}
                >
                  {/* Outer glow — bigger and brighter when in free mode */}
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={isFree ? 18 : 14}
                    fill={med.color.dot}
                    opacity={isFree ? 0.45 : 0.2}
                  />
                  {isFree && (
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={14}
                      fill="none"
                      stroke={med.color.dot}
                      strokeWidth="1.5"
                      opacity="0.7"
                    />
                  )}
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={8}
                    fill={med.color.dot}
                    stroke={med.color.ring}
                    strokeWidth="2.5"
                  />
                </g>
              );
            })
          )}
        </svg>
      </div>

      {/* One pill row per medication */}
      <div className="flex flex-col items-center gap-2 w-full">
        {medDoses.map(({ med, doses, spacing }) => (
          <MedRow
            key={med.id}
            med={med}
            doses={doses}
            spacing={spacing}
            hour12={hour12}
            formatHour={formatHour}
            formatSpacing={formatSpacing}
            updateMed={updateMed}
            removeMed={removeMed}
            canDelete={meds.length > 1}
          />
        ))}

        {/* Add medication button */}
        {meds.length < MED_COLORS.length && (
          <button
            onClick={addMed}
            className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-800 active:bg-slate-700 border border-dashed border-slate-600 rounded-full px-4 py-1.5 text-sm text-slate-300"
          >
            <span className="text-lg leading-none">+</span>
            <span>Add medication</span>
          </button>
        )}

        {/* Optimize buttons + explanation */}
        {meds.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 w-full" style={{ maxWidth: "390px" }}>
            <div className="flex gap-2 w-full">
              <button
                onClick={optimizeForSleep}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-900/40 hover:bg-indigo-900/60 active:bg-indigo-900/80 border border-indigo-700 rounded-full px-3 py-1.5 text-sm text-indigo-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Optimize ±10%</span>
              </button>
              <button
                onClick={superOptimizeForSleep}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-900/40 hover:bg-violet-900/60 active:bg-violet-900/80 border border-violet-700 rounded-full px-3 py-1.5 text-sm text-violet-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  <path d="M19 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
                </svg>
                <span>Optimize ±20%</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed px-2">
              Arranges your doses to avoid 11 PM&ndash;5 AM and group multiple medications into the same dose times when possible. The percentage is how far each dose can shift from its evenly-spaced time.
            </p>
            <p className="text-[10px] text-amber-300/80 text-center leading-relaxed px-2 italic">
              RX Wheel is for planning purposes only and is not medical advice. Always consult your doctor or pharmacist before changing your medication schedule. Use at your own risk.
            </p>
          </div>
        )}

        {/* Schedule summary with copy button */}
        <div
          className="relative mt-4 w-full"
          style={{ width: "390px", maxWidth: "92vw" }}
        >
          {meds.length > 0 && (
            <>
              <div className="text-xs text-slate-400 mb-1 px-1">Schedule summary</div>
              <textarea
                id="schedule-summary"
                readOnly
                value={summaryText}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl text-[12px] text-slate-200 font-mono p-3 pr-12 resize-none outline-none"
                rows={Math.min(meds.length * 4 + 2, 10)}
              />
              <button
                onClick={handleCopy}
                className="absolute top-7 right-2 px-2.5 py-1 text-[11px] rounded-md bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-600"
                aria-label="Copy schedule"
              >
                {copied ? "Copied!" : "Copy"}
              </button>

              {/* Add to Calendar button */}
              <button
                onClick={handleDownloadIcs}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-xl bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-600 font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Add to Calendar
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div
          className="mt-6 text-[12px] text-slate-400 leading-relaxed w-full"
          style={{ width: "390px", maxWidth: "92vw" }}
        >
          <div className="text-xs text-slate-300 font-medium mb-2">How to use</div>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>Use <span className="text-slate-200">+ / −</span> to set how many doses per day.</li>
            <li>Drag any dot on the clock to shift that medication's schedule. Times stay equally spaced and snap to 5-minute increments.</li>
            <li>Double-tap a single dose to adjust just that one — its glow brightens. The dose can drift up to 20% of the spacing in either direction. Tap anywhere else to exit fine-tuning.</li>
            <li>Tap a medication's name to rename it.</li>
            <li>Toggle <span className="text-slate-200">12h / 24h</span> in the top right to change the time format.</li>
            <li>Swipe a medication card to the left to delete it.</li>
            <li>Tap <span className="text-slate-200">+ Add medication</span> to track another schedule on the same clock.</li>
            <li>Tap <span className="text-slate-200">Optimize ±10%</span> or <span className="text-slate-200">Optimize ±20%</span> to automatically arrange every medication to avoid 11 PM &ndash; 5 AM and share dose times where possible. Higher percent allows more shifting and tighter clustering at the cost of less even spacing.</li>
            <li><span className="text-slate-200">Copy</span> the schedule summary to save or share it. The link at the bottom opens your schedule on any device.</li>
          </ul>

          {/* Pill organizer recommendations (Amazon affiliate links) */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-300 font-medium mb-2">Pill organizers we recommend</div>
            <p className="text-[11px] text-slate-500 mb-2">
              Pair your schedule with a physical organizer that matches your dosing pattern.
            </p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>
                <a
                  href="https://amzn.to/3RaWzJX"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  Weekly pill organizer (4× per day)
                </a>
              </li>
              <li>
                <a
                  href="https://amzn.to/4dbghOp"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  AM/PM pill case (2× per day)
                </a>
              </li>
              <li>
                <a
                  href="https://amzn.to/4cUXvtn"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  Travel pill case
                </a>
              </li>
            </ul>
            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
              As an Amazon Associate, we earn from qualifying purchases. This doesn't affect the price you pay.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 mb-2 text-center">
          <a
            href="/about"
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            About RX Wheel
          </a>
        </div>
      </div>
    </div>
  );
}
