import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import { createPortal } from "react-dom";
import Konva from "konva";
import {
  Stage,
  Layer,
  Group,
  Circle as KonvaCircle,
  Image as KonvaImage,
  Line,
  Rect,
  Text as KonvaText,
  Transformer
} from "react-konva";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlertCircle,
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  BringToFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Columns3,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FolderPlus,
  Hand,
  ImageUp,
  KeyRound,
  LoaderCircle,
  Lock,
  LogOut,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  Pipette,
  Plus,
  Rows3,
  Save,
  Search,
  SendToBack,
  Settings,
  Shapes,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  SquareRoundCorner,
  Sparkles,
  TextCursorInput,
  Trash2,
  Type,
  UserPlus,
  Users,
  Redo2,
  Undo2,
  X
} from "lucide-react";

type RowData = Record<string, string>;

type AdminRole = "super_admin" | "admin";

type AdminUser = {
  id: string;
  account: string;
  name: string;
  role: AdminRole;
  createdAt: string;
};

type CanvasTool = "move" | "hand" | "text";
type DesignPanel = "elements" | "effects" | "images" | "text";
type ShapeVariant = "frame" | "rect" | "circle" | "image";
type ImageUsage = "frame-fill" | "standalone";
type CornerRadiusKey = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

type CornerRadii = Record<CornerRadiusKey, number>;

type InlineTextEditor = {
  layerId: string;
  value: string;
};

type AppStateUpdater = AppState | ((current: AppState) => AppState);

type CloudSyncState = {
  status: "loading" | "local" | "ready" | "saving" | "saved" | "error";
  message: string;
};

type CloudinaryResourceType = "image" | "raw" | "auto";
type DatasetSourceKind = "upload" | "google-sheet";

type Dataset = {
  id: string;
  name: string;
  columns: string[];
  rows: RowData[];
  keyColumn: string;
  importedAt: string;
  sourceKind?: DatasetSourceKind;
  sourceName?: string;
  sourceUrl?: string;
  sourceMimeType?: string;
  sourceSize?: number;
};

type PendingDataset = Omit<Dataset, "id" | "importedAt"> & {
  sourceFile?: File;
};

type TextLayer = {
  id: string;
  name: string;
  kind?: "text" | "shape";
  shapeVariant?: ShapeVariant;
  column: string;
  content?: string;
  x: number;
  y: number;
  rotation?: number;
  width: number;
  height?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle?: "normal" | "italic";
  color: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  cornerRadii?: CornerRadii;
  opacity?: number;
  imageDataUrl?: string;
  imageName?: string;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  imageCropFocusX?: number;
  imageCropFocusY?: number;
  imageCropZoom?: number;
  imageUsage?: ImageUsage;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase";
  createdByClient?: boolean;
  /** Admin guidance shown to clients when they hover this editable field. */
  clientPrompt?: string;
};

type LayerBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type AlignmentGuide = {
  id: string;
  orientation: "horizontal" | "vertical";
  points: [number, number, number, number];
};

type Template = {
  id: string;
  name: string;
  folderId: string;
  width: number;
  height: number;
  backgroundDataUrl: string;
  layers: TextLayer[];
  updatedAt: string;
};

type TemplateImage = {
  id: string;
  name: string;
  folderId: string;
  imageFolderId?: string;
  width: number;
  height: number;
  dataUrl: string;
  createdAt: string;
};

type EffectAsset = TemplateImage;

type PendingTemplateUploadStatus = "ready" | "uploading" | "saved" | "error";

type PendingTemplateUpload = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  file: File;
  optimizedFile: File;
  optimizedWidth: number;
  optimizedHeight: number;
  status: PendingTemplateUploadStatus;
  error?: string;
};

type TemplateFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
};

type ImageFolder = {
  id: string;
  name: string;
  projectFolderId: string;
  createdAt: string;
};

type CustomFont = {
  family: string;
  dataUrl: string;
  fileName?: string;
  styleName?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
};

type AppState = {
  templateFolders: TemplateFolder[];
  imageFolders: ImageFolder[];
  templateImages: TemplateImage[];
  effectAssets: EffectAsset[];
  templates: Template[];
  activeTemplateId: string;
  datasets: Dataset[];
  activeDatasetId: string;
  customFonts: CustomFont[];
};

type ProjectListingMode = "home" | "folders" | "designs";
type ProjectFolderDetailTab = "designs" | "images";
type ProjectSortOrder = "newest" | "oldest";
type ProjectViewMode = "grid" | "list";
type ProjectRoute =
  | { admin: boolean; kind: "home" }
  | { admin: boolean; kind: "folders" }
  | { admin: boolean; kind: "designs" }
  | { admin: boolean; kind: "folder-detail"; id: string }
  | { admin: boolean; kind: "design-detail"; id: string };

const PROJECT_PREVIEW_ROWS = 2;
const PROJECT_FOLDER_DETAIL_ROWS = 4;
const PROJECT_CONTENT_FALLBACK_WIDTH = 1136;
const PROJECT_FOLDER_CARD_MIN_WIDTH = 230;
const PROJECT_FOLDER_CARD_GAP = 26;
const PROJECT_DESIGN_CARD_MIN_WIDTH = 220;
const PROJECT_DESIGN_CARD_GAP = 24;

function getGridItemLimit(contentWidth: number, minCardWidth: number, gap: number, rows: number) {
  const columns = Math.max(1, Math.floor((contentWidth + gap) / (minCardWidth + gap)));
  return columns * rows;
}

function getTwoRowPreviewLimit(contentWidth: number, minCardWidth: number, gap: number) {
  const columns = Math.max(1, Math.floor((contentWidth + gap) / (minCardWidth + gap)));
  // A single-column (mobile) layout has no room to preview a second item per
  // row, so a "2 row" cap would only ever show 2 cards. Show the full list
  // instead of a near-useless preview in that case.
  if (columns <= 1) return Infinity;
  return columns * PROJECT_PREVIEW_ROWS;
}

function getProjectRouteFromPath(pathname: string): ProjectRoute | null {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (!segments.length) return { admin: false, kind: "home" };
  if (segments.length === 1 && segments[0] === "admin") return { admin: true, kind: "home" };
  const isAdminProjectRoute = segments[0] === "admin" && segments[1] === "projects";
  const routeStart = isAdminProjectRoute ? 2 : 1;
  if (!isAdminProjectRoute && segments[0] !== "projects") return null;
  if (segments.length === routeStart) return { admin: isAdminProjectRoute, kind: "home" };
  if (segments[routeStart] === "folders") {
    return segments[routeStart + 1]
      ? { admin: isAdminProjectRoute, kind: "folder-detail", id: segments[routeStart + 1] }
      : { admin: isAdminProjectRoute, kind: "folders" };
  }
  if (segments[routeStart] === "designs") {
    return segments[routeStart + 1]
      ? { admin: isAdminProjectRoute, kind: "design-detail", id: segments[routeStart + 1] }
      : { admin: isAdminProjectRoute, kind: "designs" };
  }
  return { admin: isAdminProjectRoute, kind: "home" };
}

function getProjectRootPath(admin = false) {
  return admin ? "/admin/projects" : "/projects";
}

function getProjectHomePath(admin = false) {
  return admin ? "/admin" : "/";
}

function getProjectFolderListingPath(admin = false) {
  return `${getProjectRootPath(admin)}/folders`;
}

function getProjectDesignListingPath(admin = false) {
  return `${getProjectRootPath(admin)}/designs`;
}

function getProjectFolderPath(folderId: string, admin = false) {
  return `${getProjectRootPath(admin)}/folders/${encodeURIComponent(folderId)}`;
}

function getProjectDesignPath(templateId: string, admin = false) {
  return `${getProjectRootPath(admin)}/designs/${encodeURIComponent(templateId)}`;
}

function setBrowserPath(path: string, replace = false) {
  if (typeof window === "undefined") return;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === path) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
}

const FALLBACK_TEXT_LAYER: TextLayer = {
  id: "layer_fallback",
  name: "Lớp chữ",
  column: "",
  content: undefined,
  x: 80,
  y: 80,
  width: 320,
  fontFamily: "Be Vietnam Pro",
  fontSize: 42,
  fontWeight: "600",
  fontStyle: "normal",
  color: "#000000",
  align: "left",
  lineHeight: 1.16,
  letterSpacing: 0,
  textTransform: "none"
};

const EMPTY_DATASET: Dataset = {
  id: "",
  name: "",
  columns: [],
  rows: [],
  keyColumn: "",
  importedAt: "",
  sourceKind: undefined,
  sourceName: undefined,
  sourceUrl: undefined,
  sourceMimeType: undefined,
  sourceSize: undefined
};

const ONEHOUSING_LOGO_URL = "/onehousing-logo.png";
const EDITOR_LOGO_URL = "https://eventci.vercel.app/favicon.ico";

declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

type HexColorInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type ProjectFolderIconProps = {
  size?: "sm" | "md" | "lg";
};

function ProjectFolderIcon({ size = "md" }: ProjectFolderIconProps) {
  return <span className={`project-folder-icon ${size}`} aria-hidden="true" />;
}

function normalizeHexColor(value: string) {
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsv(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max
  };
}

function hsvToRgb(h: number, s: number, v: number) {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return {
    r: (red + m) * 255,
    g: (green + m) * 255,
    b: (blue + m) * 255
  };
}

function hueToHex(hue: number) {
  const rgb = hsvToRgb(hue, 1, 1);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function HexColorInput({ value, onChange, disabled = false }: HexColorInputProps) {
  const [draft, setDraft] = useState(value.toUpperCase());
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const swatchButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const colorAreaRef = useRef<HTMLDivElement>(null);
  const canPickScreenColor = typeof window !== "undefined" && Boolean(window.EyeDropper);
  const rgb = hexToRgb(value);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const hue = Math.round(hsv.h);
  const hueColor = hueToHex(hue || 0);
  const presetColors = [
    "#000000",
    "#ffffff",
    "#8b3dff",
    "#2f6fe4",
    "#00c4cc",
    "#22c55e",
    "#facc15",
    "#fb923c",
    "#ef4444",
    "#ec4899"
  ];

  useEffect(() => {
    setDraft(value.toUpperCase());
  }, [value]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const anchor = swatchButtonRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = 332;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, anchor.left - 18));
      const top =
        anchor.bottom + 10 + 330 > window.innerHeight
          ? Math.max(12, anchor.top - 330)
          : anchor.bottom + 10;
      setPopoverPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        swatchButtonRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function handleChange(nextValue: string) {
    setDraft(nextValue.toUpperCase());
    const normalized = normalizeHexColor(nextValue);
    if (normalized) onChange(normalized);
  }

  function handleBlur() {
    const normalized = normalizeHexColor(draft);
    setDraft((normalized || value).toUpperCase());
  }

  async function pickScreenColor() {
    if (disabled || !window.EyeDropper) return;
    try {
      const result = await new window.EyeDropper().open();
      handleChange(result.sRGBHex);
    } catch {
      // User cancelled the picker.
    }
  }

  function applyHsv(nextHue: number, saturation: number, brightness: number) {
    const nextRgb = hsvToRgb(nextHue, saturation, brightness);
    handleChange(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  }

  function pickFromColorArea(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const rect = colorAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const saturation = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const brightness = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    applyHsv(hue || 0, saturation, brightness);
  }

  const popover =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            className="color-picker-popover"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            <div
              ref={colorAreaRef}
              className="color-picker-area"
              style={{ backgroundColor: hueColor }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                pickFromColorArea(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons === 1) pickFromColorArea(event);
              }}
            >
              <span
                className="color-picker-target"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`
                }}
              />
            </div>
            <input
              className="color-picker-hue"
              type="range"
              min={0}
              max={359}
              value={hue}
              onChange={(event) => applyHsv(Number(event.target.value), hsv.s || 1, hsv.v || 1)}
            />
            <div className="color-picker-presets">
              {presetColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={normalizeHexColor(color) === normalizeHexColor(value) ? "active" : ""}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                  onClick={() => handleChange(color)}
                />
              ))}
            </div>
            <div className="color-picker-footer">
              <button
                type="button"
                className="color-picker-current"
                style={{ backgroundColor: value }}
                aria-label="Current color"
              />
              <input
                type="text"
                value={draft}
                disabled={disabled}
                maxLength={7}
                spellCheck={false}
                placeholder="#000000"
                aria-label="Hex color"
                onChange={(event) => handleChange(event.target.value)}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="color-picker-eyedropper"
                title="Pick color"
                disabled={disabled || !canPickScreenColor}
                onClick={pickScreenColor}
              >
                <Pipette size={17} />
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="hex-color-field">
      <button
        ref={swatchButtonRef}
        type="button"
        className="hex-color-swatch"
        style={{ backgroundColor: value }}
        title="Chọn màu"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      />
      <input
        type="text"
        value={draft}
        disabled={disabled}
        maxLength={7}
        spellCheck={false}
        placeholder="#000000"
        aria-label="Mã màu hex"
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
      <button
        type="button"
        className="hex-color-picker-btn"
        title="Hút màu trên ảnh"
        disabled={disabled || !canPickScreenColor}
        onClick={pickScreenColor}
      >
        <Pipette size={16} />
      </button>
      {popover}
    </div>
  );
}

function CustomSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Chọn",
  searchable = false,
  searchPlaceholder = "Tìm kiếm"
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectSearch, setSelectSearch] = useState("");
  const selectedOption = options.find((option) => option.value === value);
  const visibleOptions = searchable && selectSearch.trim()
    ? options.filter((option) => normalizeText(option.label).includes(normalizeText(selectSearch)))
    : options;

  function commitValue(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    setSelectSearch("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const currentIndex = options.findIndex((option) => option.value === value);

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((current) => !current);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!options.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        currentIndex === -1
          ? direction === 1
            ? 0
            : options.length - 1
          : (currentIndex + direction + options.length) % options.length;
      commitValue(options[nextIndex].value);
    }
  }

  return (
    <div
      className={`custom-select ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={18} />
      </button>

      {isOpen ? (
        <div className="custom-select-menu" role="listbox">
          {searchable ? (
            <div className="custom-select-search">
              <Search size={16} />
              <input
                autoFocus
                value={selectSearch}
                placeholder={searchPlaceholder}
                onChange={(event) => setSelectSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setIsOpen(false);
                }}
              />
            </div>
          ) : null}
          {visibleOptions.map((option) => {
            const isSelected = option.value === selectedOption?.value;
            return (
              <button
                type="button"
                key={option.value}
                className={isSelected ? "custom-select-option selected" : "custom-select-option"}
                role="option"
                aria-selected={isSelected}
                onClick={() => commitValue(option.value)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={16} /> : null}
              </button>
            );
          })}
          {!visibleOptions.length ? (
            <div className="custom-select-empty">Không tìm thấy</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const STORAGE_KEY = "oh-property-maker-state-v2";
const WORKSPACE_SESSION_KEY = "oh-property-maker-workspace-session-v1";
const LOCAL_BACKUP_DB_NAME = "oh-property-maker-local-backup";
const LOCAL_BACKUP_STORE_NAME = "state";
const LOCAL_BACKUP_RECORD_KEY = "app";
const ADMIN_KEY = "oh-property-maker-admin-ok";
const ADMIN_LAST_ACTIVITY_KEY = "oh-property-maker-admin-last-activity";
const ADMIN_ACCOUNT_KEY = "oh-property-maker-admin-account";
const ADMIN_PASSWORD_HASH_KEY = "oh-property-maker-admin-password-hash";
const DEFAULT_ADMIN_ACCOUNT = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const SUPER_ADMIN_NAME = "Super Admin";
const MIN_ADMIN_PASSWORD_LENGTH = 4;
const DEFAULT_TEMPLATE_FOLDER_ID = "folder_default";
const DEFAULT_TEMPLATE_WIDTH = 1200;
const DEFAULT_TEMPLATE_HEIGHT = 1500;
const CORNER_RADIUS_MAX = 240;
const CORNER_RADIUS_KEYS: Array<{ key: CornerRadiusKey; title: string }> = [
  { key: "topLeft", title: "Góc trên trái" },
  { key: "topRight", title: "Góc trên phải" },
  { key: "bottomLeft", title: "Góc dưới trái" },
  { key: "bottomRight", title: "Góc dưới phải" }
];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;
const GUIDE_SNAP_THRESHOLD = 6;
const MARQUEE_SELECTION_TOLERANCE = 3;
const GUIDE_EXTENSION = 18;
const HISTORY_LIMIT = 80;
const DEFAULT_ADDED_TEXT_FONT_SIZE = 24;
const ADMIN_IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

const BASE_FONTS = ["Be Vietnam Pro", "Arial", "Inter", "Georgia", "Times New Roman"];
const DEFAULT_FRAME_PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#bfeeff"/>
      <stop offset="1" stop-color="#f4fbff"/>
    </linearGradient>
    <linearGradient id="farHill" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#d6ec8c"/>
      <stop offset="1" stop-color="#bde679"/>
    </linearGradient>
    <linearGradient id="nearHill" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#94c700"/>
      <stop offset="1" stop-color="#79ad00"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#sky)"/>
  <path d="M0 408 C90 392 144 418 236 425 C315 431 350 411 424 432 C493 451 538 457 600 448 L600 600 L0 600 Z" fill="url(#farHill)"/>
  <path d="M0 493 C94 508 163 478 244 460 C334 440 387 465 468 468 C518 470 558 463 600 458 L600 600 L0 600 Z" fill="url(#nearHill)"/>
  <circle cx="292" cy="154" r="64" fill="#ffffff"/>
  <circle cx="212" cy="194" r="49" fill="#ffffff"/>
  <circle cx="385" cy="202" r="36" fill="#ffffff"/>
  <rect x="206" y="180" width="210" height="70" rx="35" fill="#ffffff"/>
</svg>`;
const DEFAULT_FRAME_PLACEHOLDER_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_FRAME_PLACEHOLDER_SVG)}`;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9]+/g, "");
}

function getStoredAdminAccount() {
  return localStorage.getItem(ADMIN_ACCOUNT_KEY) || DEFAULT_ADMIN_ACCOUNT;
}

function getStoredAdminPasswordHash() {
  return (
    localStorage.getItem(ADMIN_PASSWORD_HASH_KEY) ||
    import.meta.env.VITE_ADMIN_CODE_HASH ||
    ""
  );
}

function touchAdminSession() {
  localStorage.setItem(ADMIN_KEY, "1");
  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
}

function isAdminSessionValid() {
  if (localStorage.getItem(ADMIN_KEY) !== "1") return false;
  const lastActivity = Number(localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY) || 0);
  return Boolean(lastActivity && Date.now() - lastActivity <= ADMIN_IDLE_TIMEOUT_MS);
}

function isLocalAdminFallbackAllowed() {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function shouldRestoreLocalAdminSession() {
  return isLocalAdminFallbackAllowed() && isAdminSessionValid();
}

function toFileSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function guessKeyColumn(columns: string[]) {
  return columns[0] || "";
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const MAX_SERVER_IMAGE_SIDE = 1999;
const SERVER_IMAGE_MIME_TYPE = "image/webp";
const SERVER_IMAGE_QUALITY = 0.86;

type OptimizedServerImage = {
  file: File;
  width: number;
  height: number;
};

function webpFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "image";
  return `${baseName}.webp`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Cannot optimize image before upload"));
      },
      mimeType,
      quality
    );
  });
}

async function optimizeImageForServerUpload(file: File): Promise<OptimizedServerImage> {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadHtmlImage(dataUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Cannot read image dimensions");
  }

  const scale = Math.min(1, MAX_SERVER_IMAGE_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.floor(sourceWidth * scale));
  const height = Math.max(1, Math.floor(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot optimize image before upload");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, SERVER_IMAGE_MIME_TYPE, SERVER_IMAGE_QUALITY);
  return {
    file: new File([blob], webpFileName(file.name), {
      type: SERVER_IMAGE_MIME_TYPE,
      lastModified: Date.now()
    }),
    width,
    height
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorMessageFromApi(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

function fetchCloudState() {
  return fetch(`/api/state?_=${Date.now()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });
}

async function uploadAssetToCloudinary(file: File, resourceType: CloudinaryResourceType) {
  const signatureResponse = await fetch("/api/cloudinary/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType })
  });
  const signatureData = await readJsonResponse(signatureResponse);
  if (!signatureResponse.ok) {
    throw new Error(errorMessageFromApi(signatureData, "Không tạo được chữ ký Cloudinary"));
  }
  const signed = signatureData as {
    apiKey: string;
    folder: string;
    timestamp: string;
    signature: string;
    uploadUrl: string;
  } | null;
  if (
    !signed ||
    typeof signed.apiKey !== "string" ||
    typeof signed.folder !== "string" ||
    typeof signed.timestamp !== "string" ||
    typeof signed.signature !== "string" ||
    typeof signed.uploadUrl !== "string"
  ) {
    throw new Error("Không tạo được chữ ký Cloudinary");
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("folder", signed.folder);
  formData.append("timestamp", signed.timestamp);
  formData.append("signature", signed.signature);

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: "POST",
    body: formData
  });
  const uploadData = await readJsonResponse(uploadResponse);
  if (!uploadResponse.ok) {
    throw new Error(errorMessageFromApi(uploadData, "Không tải file lên Cloudinary được"));
  }
  const uploaded = uploadData as {
    secure_url?: string;
    url?: string;
    width?: number;
    height?: number;
  };
  const url = uploaded.secure_url || uploaded.url;
  if (!url) throw new Error("Cloudinary không trả về URL file");
  return {
    url,
    width: uploaded.width,
    height: uploaded.height
  };
}

function cleanFontFamily(fileName: string) {
  return fileName
    .replace(/\.(woff2?|ttf|otf)$/i, "")
    .replace(/^(?:\._|_)+/, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

const FONT_WEIGHT_LABELS: Record<string, { label: string; weight: string }> = {
  thin: { label: "Thin", weight: "100" },
  hairline: { label: "Thin", weight: "100" },
  extralight: { label: "Extra Light", weight: "200" },
  ultralight: { label: "Extra Light", weight: "200" },
  light: { label: "Light", weight: "300" },
  regular: { label: "Regular", weight: "400" },
  normal: { label: "Regular", weight: "400" },
  book: { label: "Regular", weight: "400" },
  medium: { label: "Medium", weight: "500" },
  semibold: { label: "Semi Bold", weight: "600" },
  demibold: { label: "Semi Bold", weight: "600" },
  bold: { label: "Semi Bold", weight: "600" },
  extrablack: { label: "Semi Bold", weight: "600" },
  ultrablack: { label: "Semi Bold", weight: "600" },
  extrabold: { label: "Semi Bold", weight: "600" },
  ultrabold: { label: "Semi Bold", weight: "600" },
  black: { label: "Semi Bold", weight: "600" },
  heavy: { label: "Semi Bold", weight: "600" }
};

function splitFontWords(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFontStyleToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecognizedFontStyleName(rawStyleName: string) {
  const tokens = splitFontWords(rawStyleName).split(/\s+/).filter(Boolean);
  const isItalic = tokens.some((token) => /^italic$/i.test(token) || /^oblique$/i.test(token));
  const weightToken = normalizeFontStyleToken(
    tokens.filter((token) => !/^italic$/i.test(token) && !/^oblique$/i.test(token)).join("")
  );
  return Boolean(FONT_WEIGHT_LABELS[weightToken]) || (isItalic && !weightToken);
}

function fontStyleDetails(rawStyleName: string) {
  const readableStyleName = splitFontWords(rawStyleName)
    .replace(/\bOblique\b/gi, "Italic")
    .trim();
  const tokens = readableStyleName.split(/\s+/).filter(Boolean);
  const isItalic = tokens.some((token) => /^italic$/i.test(token) || /^oblique$/i.test(token));
  const weightToken = normalizeFontStyleToken(
    tokens.filter((token) => !/^italic$/i.test(token) && !/^oblique$/i.test(token)).join("")
  );
  const weightInfo = FONT_WEIGHT_LABELS[weightToken] || FONT_WEIGHT_LABELS.regular;
  return {
    styleName: `${weightInfo.label} ${weightInfo.weight}${isItalic ? " Italic" : ""}`,
    fontWeight: weightInfo.weight,
    fontStyle: isItalic ? ("italic" as const) : ("normal" as const)
  };
}

function clampFontWeight(value: string | undefined, fallback = "400") {
  if (!value) return fallback;
  const normalized = value.toLowerCase() === "bold" || value.toLowerCase() === "bolder" ? 600 : Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return String(Math.min(600, Math.max(100, normalized)));
}

function layerFontStyleValue(layer: Pick<TextLayer, "fontWeight" | "fontStyle">) {
  return layer.fontStyle === "italic" ? `italic ${layer.fontWeight}` : layer.fontWeight;
}

function isShapeLayer(layer: TextLayer | null | undefined): layer is TextLayer & { kind: "shape" } {
  return layer?.kind === "shape";
}

function isStandaloneImageLayer(layer: TextLayer | null | undefined) {
  if (!isShapeLayer(layer)) return false;
  if (layer.shapeVariant === "image") return true;
  if (layer.imageUsage === "standalone") return true;
  if (layer.imageUsage === "frame-fill") return false;
  if (!layer.imageDataUrl) return false;
  return layer.id.startsWith("frame_");
}

function canEditLayerForMode(layer: TextLayer | null | undefined, isAdminWorkspace: boolean) {
  return Boolean(layer && (isAdminWorkspace || layer.createdByClient || layer.clientPrompt));
}

function fontInfoFromFileName(fileName: string) {
  const baseName = cleanFontFamily(fileName);
  const nameWithoutVariableSuffix = baseName.replace(/-?VariableFont.*$/i, "");
  const words = splitFontWords(nameWithoutVariableSuffix).split(/\s+/).filter(Boolean);
  let styleStartIndex = words.length;
  for (let index = Math.max(0, words.length - 3); index < words.length; index += 1) {
    if (isRecognizedFontStyleName(words.slice(index).join(" "))) {
      styleStartIndex = index;
      break;
    }
  }
  const rawFamily = words.slice(0, styleStartIndex).join(" ") || nameWithoutVariableSuffix;
  const rawStyle = words.slice(styleStartIndex).join(" ") || "Regular";
  const style = fontStyleDetails(rawStyle);
  const family = splitFontWords(rawFamily);
  return {
    family: family || splitFontWords(baseName) || "Font tuy chinh",
    ...style
  };
}
async function registerFont(font: CustomFont) {
  if (!("FontFace" in window)) return;
  const weight = clampFontWeight(font.fontWeight);
  const style = font.fontStyle || "normal";
  const existing = Array.from(document.fonts).some(
    (item) => item.family === font.family && item.weight === weight && item.style === style
  );
  if (existing) return;
  const face = new FontFace(font.family, `url(${font.dataUrl})`, {
    weight,
    style
  });
  await face.load();
  document.fonts.add(face);
}

function defaultTemplateImage() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#071025"/>
        <stop offset="0.52" stop-color="#1d4a99"/>
        <stop offset="1" stop-color="#256fe6"/>
      </linearGradient>
      <linearGradient id="panel" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.98"/>
        <stop offset="1" stop-color="#eff6ff" stop-opacity="0.96"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)"/>
    <path d="M0 740 C210 670 330 790 520 710 C710 630 850 690 1080 610 L1080 1350 L0 1350 Z" fill="#f5f7fb"/>
    <rect x="86" y="86" width="908" height="514" rx="38" fill="#ffffff" opacity="0.12"/>
    <rect x="112" y="110" width="856" height="462" rx="30" fill="#071025" opacity="0.36"/>
    <path d="M160 498 L310 318 L440 424 L556 250 L782 498 Z" fill="#ffffff" opacity="0.18"/>
    <circle cx="838" cy="212" r="76" fill="#ffffff" opacity="0.18"/>
    <rect x="86" y="806" width="908" height="408" rx="34" fill="url(#panel)"/>
    <rect x="130" y="884" width="820" height="2" fill="#dde4f0"/>
    <rect x="130" y="1102" width="820" height="2" fill="#dde4f0"/>
    <text x="130" y="126" fill="#ffffff" font-family="Arial" font-size="28" font-weight="600">OneHousing</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
}

function normalizeOptionalPositiveNumber(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : undefined;
}

function clamp01(value: unknown, fallback = 0.5) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? Math.min(1, Math.max(0, nextValue)) : fallback;
}

const IMAGE_CROP_MIN_ZOOM = 1;
const IMAGE_CROP_MAX_ZOOM = 4;

function clampImageCropZoom(value: unknown, fallback = IMAGE_CROP_MIN_ZOOM) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue)
    ? Math.min(IMAGE_CROP_MAX_ZOOM, Math.max(IMAGE_CROP_MIN_ZOOM, nextValue))
    : fallback;
}

function clampCornerRadius(value: unknown) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue)
    ? Math.min(CORNER_RADIUS_MAX, Math.max(0, Math.round(nextValue)))
    : 0;
}

function normalizeCornerRadii(value: unknown, fallback = 0): CornerRadii | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<Record<CornerRadiusKey, unknown>>;
  return {
    topLeft: clampCornerRadius(source.topLeft ?? fallback),
    topRight: clampCornerRadius(source.topRight ?? fallback),
    bottomRight: clampCornerRadius(source.bottomRight ?? fallback),
    bottomLeft: clampCornerRadius(source.bottomLeft ?? fallback)
  };
}

function cornerRadiiFromUniform(value: unknown): CornerRadii {
  const radius = clampCornerRadius(value);
  return {
    topLeft: radius,
    topRight: radius,
    bottomRight: radius,
    bottomLeft: radius
  };
}

function getLayerCornerRadii(layer: Pick<TextLayer, "cornerRadius" | "cornerRadii">): CornerRadii {
  return layer.cornerRadii || cornerRadiiFromUniform(layer.cornerRadius || 0);
}

function areCornerRadiiUniform(radii: CornerRadii) {
  return (
    radii.topLeft === radii.topRight &&
    radii.topLeft === radii.bottomRight &&
    radii.topLeft === radii.bottomLeft
  );
}

function getCornerRadiusPreviewValue(layer: Pick<TextLayer, "cornerRadius" | "cornerRadii">) {
  const radii = getLayerCornerRadii(layer);
  return areCornerRadiiUniform(radii) ? radii.topLeft : clampCornerRadius(layer.cornerRadius || 0);
}

function getShapeCornerRadius(
  layer: Pick<TextLayer, "shapeVariant" | "cornerRadius" | "cornerRadii">,
  width: number,
  height: number
) {
  if (layer.shapeVariant === "circle") return Math.min(width, height) / 2;
  if (layer.cornerRadii) {
    const radii = getLayerCornerRadii(layer);
    return [radii.topLeft, radii.topRight, radii.bottomRight, radii.bottomLeft];
  }
  return layer.cornerRadius || 0;
}

function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radii: CornerRadii
) {
  const maxRadius = Math.max(0, Math.min(width, height) / 2);
  const topLeft = Math.min(radii.topLeft, maxRadius);
  const topRight = Math.min(radii.topRight, maxRadius);
  const bottomRight = Math.min(radii.bottomRight, maxRadius);
  const bottomLeft = Math.min(radii.bottomLeft, maxRadius);

  return [
    `M ${x + topLeft} ${y}`,
    `H ${x + width - topRight}`,
    topRight ? `Q ${x + width} ${y} ${x + width} ${y + topRight}` : `L ${x + width} ${y}`,
    `V ${y + height - bottomRight}`,
    bottomRight
      ? `Q ${x + width} ${y + height} ${x + width - bottomRight} ${y + height}`
      : `L ${x + width} ${y + height}`,
    `H ${x + bottomLeft}`,
    bottomLeft ? `Q ${x} ${y + height} ${x} ${y + height - bottomLeft}` : `L ${x} ${y + height}`,
    `V ${y + topLeft}`,
    topLeft ? `Q ${x} ${y} ${x + topLeft} ${y}` : `L ${x} ${y}`,
    "Z"
  ].join(" ");
}

function normalizeLayer(layer: Partial<TextLayer> | null | undefined, index = 0): TextLayer {
  const align = layer?.align;
  const textTransform = layer?.textTransform;
  const kind = layer?.kind === "shape" ? "shape" : "text";
  const normalizedColor =
    typeof layer?.color === "string" && normalizeHexColor(layer.color)
      ? normalizeHexColor(layer.color)!
      : FALLBACK_TEXT_LAYER.color;
  const normalizedFill =
    typeof layer?.fill === "string" && normalizeHexColor(layer.fill)
      ? normalizeHexColor(layer.fill)!
      : kind === "shape"
        ? "#e9f8ff"
        : undefined;
  const normalizedStroke =
    typeof layer?.stroke === "string" && normalizeHexColor(layer.stroke)
      ? normalizeHexColor(layer.stroke)!
      : kind === "shape"
        ? "#8b3dff"
        : undefined;
  const normalizedShapeVariant =
    layer?.shapeVariant === "frame" ||
    layer?.shapeVariant === "circle" ||
    layer?.shapeVariant === "rect" ||
    layer?.shapeVariant === "image"
      ? layer.shapeVariant
      : kind === "shape"
        ? "rect"
        : undefined;
  const normalizedImageDataUrl =
    kind === "shape" && typeof layer?.imageDataUrl === "string"
      ? layer.imageDataUrl
      : undefined;
  const normalizedImageUsage =
    normalizedImageDataUrl && (layer?.imageUsage === "standalone" || normalizedShapeVariant === "image")
      ? "standalone"
      : normalizedImageDataUrl && layer?.imageUsage === "frame-fill"
        ? "frame-fill"
      : normalizedImageDataUrl
        ? typeof layer?.id === "string" && layer.id.startsWith("frame_")
          ? "standalone"
          : "frame-fill"
        : undefined;
  const outputShapeVariant =
    normalizedImageUsage === "standalone"
      ? "image"
      : normalizedShapeVariant === "image" && !normalizedImageDataUrl
        ? "frame"
        : normalizedShapeVariant;
  return {
    ...FALLBACK_TEXT_LAYER,
    ...layer,
    kind,
    shapeVariant: outputShapeVariant,
    id: typeof layer?.id === "string" && layer.id ? layer.id : uid("layer"),
    name: typeof layer?.name === "string" && layer.name ? layer.name : `Lớp chữ ${index + 1}`,
    column: kind === "shape" ? "" : typeof layer?.column === "string" ? layer.column : "",
    content: kind === "shape" ? undefined : typeof layer?.content === "string" ? layer.content : undefined,
    x: Number.isFinite(Number(layer?.x)) ? Number(layer?.x) : FALLBACK_TEXT_LAYER.x,
    y: Number.isFinite(Number(layer?.y)) ? Number(layer?.y) : FALLBACK_TEXT_LAYER.y,
    rotation: Number.isFinite(Number(layer?.rotation)) ? Number(layer?.rotation) : 0,
    width: normalizePositiveNumber(layer?.width, FALLBACK_TEXT_LAYER.width),
    height: kind === "shape" ? normalizePositiveNumber(layer?.height, 220) : layer?.height,
    fontFamily:
      typeof layer?.fontFamily === "string" && layer.fontFamily
        ? layer.fontFamily
        : FALLBACK_TEXT_LAYER.fontFamily,
    fontSize: normalizePositiveNumber(layer?.fontSize, FALLBACK_TEXT_LAYER.fontSize),
    fontWeight: clampFontWeight(
      typeof layer?.fontWeight === "string" ? layer.fontWeight : undefined,
      FALLBACK_TEXT_LAYER.fontWeight
    ),
    fontStyle:
      layer?.fontStyle === "italic" || layer?.fontStyle === "normal"
        ? layer.fontStyle
        : FALLBACK_TEXT_LAYER.fontStyle,
    color: normalizedColor,
    fill: normalizedFill,
    stroke: normalizedStroke,
    strokeWidth: Number.isFinite(Number(layer?.strokeWidth))
      ? Math.max(0, Number(layer?.strokeWidth))
      : kind === "shape"
        ? 0
        : undefined,
    cornerRadius: Number.isFinite(Number(layer?.cornerRadius))
      ? Math.max(0, Number(layer?.cornerRadius))
      : kind === "shape"
        ? 0
        : undefined,
    cornerRadii:
      kind === "shape"
        ? normalizeCornerRadii(layer?.cornerRadii, layer?.cornerRadius || 0)
        : undefined,
    opacity: Number.isFinite(Number(layer?.opacity))
      ? Math.min(1, Math.max(0.05, Number(layer?.opacity)))
      : 1,
    imageDataUrl: normalizedImageDataUrl,
    imageName:
      kind === "shape" && typeof layer?.imageName === "string"
        ? layer.imageName
        : undefined,
    imageOriginalWidth: normalizedImageDataUrl
      ? normalizeOptionalPositiveNumber(layer?.imageOriginalWidth)
      : undefined,
    imageOriginalHeight: normalizedImageDataUrl
      ? normalizeOptionalPositiveNumber(layer?.imageOriginalHeight)
      : undefined,
    imageCropFocusX: normalizedImageDataUrl ? clamp01(layer?.imageCropFocusX) : undefined,
    imageCropFocusY: normalizedImageDataUrl ? clamp01(layer?.imageCropFocusY) : undefined,
    imageCropZoom: normalizedImageDataUrl ? clampImageCropZoom(layer?.imageCropZoom) : undefined,
    imageUsage: normalizedImageUsage,
    align: align === "center" || align === "right" || align === "left" ? align : "left",
    lineHeight: normalizePositiveNumber(layer?.lineHeight, FALLBACK_TEXT_LAYER.lineHeight),
    letterSpacing: Number.isFinite(Number(layer?.letterSpacing))
      ? Number(layer?.letterSpacing)
      : FALLBACK_TEXT_LAYER.letterSpacing,
    textTransform:
      textTransform === "uppercase" || textTransform === "lowercase" || textTransform === "none"
        ? textTransform
        : "none"
  };
}

function normalizeTemplate(template: Partial<Template> | null | undefined, index = 0): Template {
  const name =
    template?.name === "OneHousing 4:5"
      ? "Ảnh mẫu OneHousing"
      : typeof template?.name === "string" && template.name.trim()
        ? template.name
        : `Trang ${index + 1}`;
  return {
    id: typeof template?.id === "string" && template.id ? template.id : uid("template"),
    name,
    folderId:
      typeof template?.folderId === "string" && template.folderId
        ? template.folderId
        : DEFAULT_TEMPLATE_FOLDER_ID,
    width: normalizePositiveNumber(template?.width, DEFAULT_TEMPLATE_WIDTH),
    height: normalizePositiveNumber(template?.height, DEFAULT_TEMPLATE_HEIGHT),
    backgroundDataUrl:
      typeof template?.backgroundDataUrl === "string"
        ? template.backgroundDataUrl
        : defaultTemplateImage(),
    layers: Array.isArray(template?.layers)
      ? template.layers.map((layer, layerIndex) => normalizeLayer(layer, layerIndex))
      : [],
    updatedAt:
      typeof template?.updatedAt === "string" && template.updatedAt
        ? template.updatedAt
        : new Date().toISOString()
  };
}

function normalizeTemplateImage(
  image: Partial<TemplateImage> | null | undefined,
  index = 0
): TemplateImage | null {
  const dataUrl = typeof image?.dataUrl === "string" ? image.dataUrl : "";
  if (!dataUrl) return null;
  return {
    id: typeof image?.id === "string" && image.id ? image.id : uid("image"),
    name:
      typeof image?.name === "string" && image.name.trim()
        ? image.name
        : `Ảnh mẫu ${index + 1}`,
    folderId:
      typeof image?.folderId === "string" && image.folderId
        ? image.folderId
        : DEFAULT_TEMPLATE_FOLDER_ID,
    imageFolderId:
      typeof image?.imageFolderId === "string" && image.imageFolderId
        ? image.imageFolderId
        : undefined,
    width: normalizePositiveNumber(image?.width, 1080),
    height: normalizePositiveNumber(image?.height, 1350),
    dataUrl,
    createdAt:
      typeof image?.createdAt === "string" && image.createdAt
        ? image.createdAt
        : new Date().toISOString()
  };
}

function normalizeImageFolder(
  folder: Partial<ImageFolder> | null | undefined,
  index = 0
): ImageFolder {
  return {
    id: typeof folder?.id === "string" && folder.id ? folder.id : uid("image_folder"),
    name:
      typeof folder?.name === "string" && folder.name.trim()
        ? folder.name.trim()
        : `Image folder ${index + 1}`,
    projectFolderId:
      typeof folder?.projectFolderId === "string" && folder.projectFolderId
        ? folder.projectFolderId
        : DEFAULT_TEMPLATE_FOLDER_ID,
    createdAt:
      typeof folder?.createdAt === "string" && folder.createdAt
        ? folder.createdAt
        : new Date().toISOString()
  };
}

function defaultTemplateFolder(): TemplateFolder {
  return {
    id: DEFAULT_TEMPLATE_FOLDER_ID,
    name: "Dự án mẫu",
    parentId: null,
    createdAt: new Date().toISOString()
  };
}

function normalizeTemplateFolder(
  folder: Partial<TemplateFolder> | null | undefined,
  index = 0
): TemplateFolder {
  return {
    id: typeof folder?.id === "string" && folder.id ? folder.id : uid("folder"),
    name:
      typeof folder?.name === "string" && folder.name.trim()
        ? folder.name
        : `Dự án ${index + 1}`,
    parentId:
      typeof folder?.parentId === "string" && folder.parentId ? folder.parentId : null,
    createdAt:
      typeof folder?.createdAt === "string" && folder.createdAt
        ? folder.createdAt
        : new Date().toISOString()
  };
}

function getNextPageName(templates: Template[]) {
  const usedNumbers = new Set<number>();
  templates.forEach((template) => {
    const match = template.name.trim().match(/^(?:page|trang)\s+(\d+)$/i);
    if (!match) return;
    usedNumbers.add(Number(match[1]));
  });

  let pageNumber = 1;
  while (usedNumbers.has(pageNumber)) {
    pageNumber += 1;
  }
  return `Trang ${pageNumber}`;
}

function getDuplicateTemplateName(sourceName: string, templates: Template[]) {
  const existingNames = new Set(templates.map((template) => localizeProjectName(template.name).trim()));
  const baseName = localizeProjectName(sourceName).trim() || "Thiết kế";
  let candidate = `${baseName} - Bản sao`;
  let copyNumber = 2;
  while (existingNames.has(candidate)) {
    candidate = `${baseName} - Bản sao ${copyNumber}`;
    copyNumber += 1;
  }
  return candidate;
}

function flattenTemplateFolders(
  folders: TemplateFolder[],
  parentId: string | null = null,
  depth = 0
): Array<TemplateFolder & { depth: number }> {
  return folders
    .filter((folder) => folder.parentId === parentId)
    .flatMap((folder) => [
      { ...folder, depth },
      ...flattenTemplateFolders(folders, folder.id, depth + 1)
    ]);
}

function getRootTemplateFolderId(
  folders: TemplateFolder[],
  folderId: string,
  fallbackFolderId = DEFAULT_TEMPLATE_FOLDER_ID
) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  let current = byId.get(folderId) || byId.get(fallbackFolderId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    current = byId.get(current.parentId) || current;
    if (!current.parentId) break;
  }
  return current?.id || fallbackFolderId;
}

function getFolderLatestActivity(
  folderId: string,
  folders: TemplateFolder[],
  templates: Template[],
  images: TemplateImage[]
) {
  const relatedFolderIds = new Set<string>([folderId]);
  let foundChild = true;
  while (foundChild) {
    foundChild = false;
    folders.forEach((folder) => {
      if (folder.parentId && relatedFolderIds.has(folder.parentId) && !relatedFolderIds.has(folder.id)) {
        relatedFolderIds.add(folder.id);
        foundChild = true;
      }
    });
  }

  const timestamps = [
    ...folders.filter((folder) => relatedFolderIds.has(folder.id)).map((folder) => folder.createdAt),
    ...templates.filter((template) => relatedFolderIds.has(template.folderId)).map((template) => template.updatedAt),
    ...images.filter((image) => relatedFolderIds.has(image.folderId)).map((image) => image.createdAt)
  ].map((value) => new Date(value).getTime()).filter(Number.isFinite);

  return timestamps.length ? Math.max(...timestamps) : 0;
}
function isBlankTemplate(template: Template | undefined) {
  return Boolean(template && !template.backgroundDataUrl && template.layers.length === 0);
}

function getTemplateLibraryImage(item: TemplateImage | Template) {
  return "dataUrl" in item ? item.dataUrl : item.backgroundDataUrl;
}

function getPreviewImageSrc(src: string, width = 480) {
  if (!src || src.startsWith("data:")) return src;
  const uploadMarker = "/image/upload/";
  const markerIndex = src.indexOf(uploadMarker);
  if (markerIndex === -1 || !src.includes("res.cloudinary.com")) return src;
  const beforeUpload = src.slice(0, markerIndex + uploadMarker.length);
  const afterUpload = src.slice(markerIndex + uploadMarker.length);
  const firstSegment = afterUpload.split("/")[0] || "";
  if (firstSegment.includes(",") && !/^v\d+$/.test(firstSegment)) return src;
  const previewWidth = Math.max(120, Math.min(960, Math.round(width)));
  return `${beforeUpload}c_limit,w_${previewWidth},q_auto,f_auto/${afterUpload}`;
}

function formatProjectTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Vừa cập nhật";
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Vừa cập nhật";
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} phút trước`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} giờ trước`;
  if (diff < day * 30) return `${Math.max(1, Math.floor(diff / day))} ngày trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

function localizeProjectName(name: string) {
  return name.replace(/^Page(\s+\d+)$/i, "Trang$1");
}

function createInitialState(): AppState {
  const template: Template = {
    id: "template_default",
    name: "Trang 1",
    folderId: DEFAULT_TEMPLATE_FOLDER_ID,
    width: DEFAULT_TEMPLATE_WIDTH,
    height: DEFAULT_TEMPLATE_HEIGHT,
    backgroundDataUrl: "",
    updatedAt: new Date().toISOString(),
    layers: []
  };

  return {
    templateFolders: [
      {
        id: DEFAULT_TEMPLATE_FOLDER_ID,
        name: "Dự án mẫu",
        parentId: null,
        createdAt: new Date().toISOString()
      }
    ],
    imageFolders: [],
    templateImages: [],
    effectAssets: [],
    templates: [template],
    activeTemplateId: template.id,
    datasets: [],
    activeDatasetId: "",
    customFonts: []
  };
}

function isLegacyDefaultAppState(parsed: Partial<AppState> | null | undefined) {
  const template = parsed?.templates?.[0];
  const templateImages = parsed?.templateImages || [];
  const datasets = parsed?.datasets || [];
  if (!template || parsed?.templates?.length !== 1) return false;
  const hasLegacyDefaultTemplate =
    template.id === "template_default" &&
    template.name === "Ảnh mẫu OneHousing" &&
    template.backgroundDataUrl === defaultTemplateImage() &&
    Array.isArray(template.layers) &&
    template.layers.length === 4 &&
    template.layers.every((layer) =>
      ["layer_code", "layer_project", "layer_area", "layer_price"].includes(layer.id)
    );
  const hasOnlyLegacyLibraryImage =
    !templateImages.length ||
    (templateImages.length === 1 &&
      templateImages[0]?.id === "image_default" &&
      templateImages[0]?.dataUrl === defaultTemplateImage());
  const hasOnlyLegacySampleDataset =
    !datasets.length ||
    (datasets.length === 1 && datasets[0]?.id === "dataset_sample");
  return hasLegacyDefaultTemplate && hasOnlyLegacyLibraryImage && hasOnlyLegacySampleDataset;
}

function normalizeAppState(parsed: Partial<AppState> | null | undefined): AppState {
  if (isLegacyDefaultAppState(parsed)) {
    return createInitialState();
  }
  if (!parsed || !Array.isArray(parsed.templates) || !parsed.templates.length) {
    return createInitialState();
  }
  const templateFolders = Array.isArray(parsed.templateFolders)
    ? parsed.templateFolders.map((folder, index) => normalizeTemplateFolder(folder, index))
    : [defaultTemplateFolder()];
  const normalizedFolders = templateFolders.length ? templateFolders : [defaultTemplateFolder()];
  const folderIds = new Set(normalizedFolders.map((folder) => folder.id));
  const fallbackFolderId = normalizedFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID;
  const parsedAny = parsed as unknown as {
    templates: Array<Partial<Template> & { libraryDataUrl?: string }>;
    templateImages?: Partial<TemplateImage>[];
    effectAssets?: Partial<EffectAsset>[];
    imageFolders?: Partial<ImageFolder>[];
  };
  const imageFolders = Array.isArray(parsedAny.imageFolders)
    ? parsedAny.imageFolders
        .map((folder, index) => normalizeImageFolder(folder, index))
        .filter((folder) => folderIds.has(folder.projectFolderId))
    : [];
  const imageFolderById = new Map(imageFolders.map((folder) => [folder.id, folder]));
  const migratedImages = parsedAny.templates
    .map((template, index) => {
      const dataUrl = template.libraryDataUrl || "";
      if (!dataUrl) return null;
      return normalizeTemplateImage(
        {
          id: template.id ? `image_${template.id}` : undefined,
          name: template.name,
          folderId: template.folderId,
          width: template.width,
          height: template.height,
          dataUrl,
          createdAt: template.updatedAt
        },
        index
      );
    })
    .filter((image): image is TemplateImage => Boolean(image));
  const savedImages = Array.isArray(parsedAny.templateImages)
    ? parsedAny.templateImages
        .map((image, index) => normalizeTemplateImage(image, index))
        .filter((image): image is TemplateImage => Boolean(image))
    : [];
  const effectAssets = Array.isArray(parsedAny.effectAssets)
    ? parsedAny.effectAssets
        .map((image, index) => normalizeTemplateImage(image, index))
        .filter((image): image is EffectAsset => Boolean(image))
    : [];
  const templateImages = [...savedImages, ...migratedImages].map((image) => ({
    ...image,
    folderId: folderIds.has(image.folderId) ? image.folderId : fallbackFolderId,
    imageFolderId:
      image.imageFolderId &&
      imageFolderById.get(image.imageFolderId)?.projectFolderId ===
        (folderIds.has(image.folderId) ? image.folderId : fallbackFolderId)
      ? image.imageFolderId
      : undefined
  }));
  const templates = removeDefaultPlaceholderTemplates(parsedAny.templates.filter((template) => !template.libraryDataUrl).map((template, index) => {
    const normalizedTemplate = normalizeTemplate(template, index);
    return {
      ...normalizedTemplate,
      folderId: folderIds.has(normalizedTemplate.folderId)
        ? normalizedTemplate.folderId
        : fallbackFolderId
    };
  }));
  if (!templates.length) {
    templates.push({
      id: uid("template"),
      name: "Trang 1",
      folderId: fallbackFolderId,
      width: DEFAULT_TEMPLATE_WIDTH,
      height: DEFAULT_TEMPLATE_HEIGHT,
      backgroundDataUrl: "",
      layers: [],
      updatedAt: new Date().toISOString()
    });
  }
  const activeTemplateId = templates.some((template) => template.id === parsed.activeTemplateId)
    ? parsed.activeTemplateId || templates[0].id
    : templates[0].id;
  const datasets = Array.isArray(parsed.datasets) ? parsed.datasets.map((dataset) => ({
    ...dataset,
    keyColumn: dataset.columns[0] || dataset.keyColumn || ""
  })) : [];
  return {
    templateFolders: normalizedFolders,
    imageFolders,
    templateImages,
    effectAssets,
    templates,
    activeTemplateId,
    datasets,
    activeDatasetId: "",
    customFonts: Array.isArray(parsed.customFonts)
      ? parsed.customFonts.map((font) => ({
          ...font,
          fontWeight: clampFontWeight(font.fontWeight)
        }))
      : []
  };
}

function persistedLibraryState(appState: AppState): AppState {
  const initialState = createInitialState();
  const templates = removeDefaultPlaceholderTemplates(appState.templates);
  return {
    ...initialState,
    templateFolders: appState.templateFolders,
    imageFolders: appState.imageFolders,
    templateImages: appState.templateImages,
    effectAssets: appState.effectAssets,
    templates,
    activeTemplateId: templates.some((template) => template.id === appState.activeTemplateId)
      ? appState.activeTemplateId
      : templates[0]?.id || initialState.activeTemplateId,
    activeDatasetId: appState.activeDatasetId,
    datasets: appState.datasets,
    customFonts: appState.customFonts
  };
}

function mergePersistedLibraries(workspaceState: AppState, persistedState: AppState): AppState {
  const shouldUsePersistedTemplates =
    hasMeaningfulTemplates(persistedState.templates) || !hasMeaningfulTemplates(workspaceState.templates);
  const templates = removeDefaultPlaceholderTemplates(
    shouldUsePersistedTemplates && persistedState.templates.length
      ? persistedState.templates
      : workspaceState.templates
  );
  // Prefer the workspace's own active template (e.g. one selected by the
  // current URL route) over the persisted/cloud value, which only tracks
  // whatever template was last active in some other session and would
  // otherwise hijack the current selection once this merge runs after the
  // page has already loaded the right design.
  const activeTemplateId = templates.some((template) => template.id === workspaceState.activeTemplateId)
    ? workspaceState.activeTemplateId
    : templates.some((template) => template.id === persistedState.activeTemplateId)
      ? persistedState.activeTemplateId
      : templates[0]?.id || workspaceState.activeTemplateId;
  return {
    ...workspaceState,
    templateFolders: persistedState.templateFolders,
    imageFolders: persistedState.imageFolders,
    templateImages: persistedState.templateImages,
    effectAssets: persistedState.effectAssets,
    templates,
    activeTemplateId,
    datasets: persistedState.datasets,
    customFonts: persistedState.customFonts,
    activeDatasetId: persistedState.datasets.some((dataset) => dataset.id === persistedState.activeDatasetId)
      ? persistedState.activeDatasetId
      : persistedState.datasets.some((dataset) => dataset.id === workspaceState.activeDatasetId)
        ? workspaceState.activeDatasetId
      : ""
  };
}

function appStateForLocalBackup(appState: AppState) {
  const libraryState = persistedLibraryState(appState);
  return {
    ...libraryState,
    templateImages: libraryState.templateImages.filter((image) => !image.dataUrl.startsWith("data:")),
    effectAssets: libraryState.effectAssets.filter((effect) => !effect.dataUrl.startsWith("data:")),
    customFonts: libraryState.customFonts.filter((font) => !font.dataUrl.startsWith("data:"))
  };
}

function openLocalBackupDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(LOCAL_BACKUP_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_BACKUP_STORE_NAME)) {
        db.createObjectStore(LOCAL_BACKUP_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Cannot open local backup"));
  });
}

async function loadIndexedDbBackup() {
  const db = await openLocalBackupDb();
  return new Promise<Partial<AppState> | null>((resolve, reject) => {
    const transaction = db.transaction(LOCAL_BACKUP_STORE_NAME, "readonly");
    const request = transaction.objectStore(LOCAL_BACKUP_STORE_NAME).get(LOCAL_BACKUP_RECORD_KEY);
    request.onsuccess = () => resolve((request.result as Partial<AppState> | undefined) || null);
    request.onerror = () => reject(request.error || new Error("Cannot read local backup"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Cannot read local backup"));
    };
  });
}

async function saveIndexedDbBackup(appState: AppState) {
  const db = await openLocalBackupDb();
  const libraryState = persistedLibraryState(appState);
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(LOCAL_BACKUP_STORE_NAME, "readwrite");
    const request = transaction.objectStore(LOCAL_BACKUP_STORE_NAME).put(libraryState, LOCAL_BACKUP_RECORD_KEY);
    request.onerror = () => reject(request.error || new Error("Cannot save local backup"));
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Cannot save local backup"));
    };
  });
}

function workspaceStateForSession(appState: AppState) {
  const templates = removeDefaultPlaceholderTemplates(appState.templates);
  return {
    templates,
    activeTemplateId: templates.some((template) => template.id === appState.activeTemplateId)
      ? appState.activeTemplateId
      : templates[0]?.id || appState.activeTemplateId,
    activeDatasetId: appState.activeDatasetId
  };
}

function latestTemplateUpdateTime(templates: Partial<Template>[] | undefined) {
  if (!Array.isArray(templates) || !templates.length) return 0;
  return templates.reduce((latest, template) => {
    const time = new Date(template.updatedAt || "").getTime();
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, 0);
}

function latestDateTime(values: Array<string | undefined>) {
  return values.reduce((latest, value) => {
    const time = new Date(value || "").getTime();
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, 0);
}

function latestPersistedLibraryUpdateTime(state: Partial<AppState> | null | undefined) {
  if (!state) return 0;
  const templateTime = hasMeaningfulTemplates(state.templates)
    ? latestTemplateUpdateTime(state.templates)
    : 0;
  const imageTime = latestDateTime(
    Array.isArray(state.templateImages)
      ? state.templateImages.map((image) => image.createdAt)
      : []
  );
  const imageFolderTime = latestDateTime(
    Array.isArray(state.imageFolders)
      ? state.imageFolders.map((folder) => folder.createdAt)
      : []
  );
  const folders = Array.isArray(state.templateFolders) ? state.templateFolders : [];
  const folderTime =
    folders.length > 1 || (folders[0]?.id && folders[0].id !== DEFAULT_TEMPLATE_FOLDER_ID)
      ? latestDateTime(folders.map((folder) => folder.createdAt))
      : 0;
  const datasetTime = latestDateTime(
    Array.isArray(state.datasets)
      ? state.datasets.map((dataset) => dataset.importedAt)
      : []
  );
  return Math.max(templateTime, imageTime, imageFolderTime, folderTime, datasetTime);
}

function isDefaultPlaceholderTemplate(template: Partial<Template> | null | undefined) {
  const name = typeof template?.name === "string" ? template.name.trim() : "";
  const isDefaultName = /^(trang|page)\s*1$/i.test(name);
  return Boolean(
    template &&
      isDefaultName &&
      !template.backgroundDataUrl &&
      (!Array.isArray(template.layers) || !template.layers.length)
  );
}

function removeDefaultPlaceholderTemplates<T extends Partial<Template>>(templates: T[]) {
  const meaningfulTemplates = templates.filter((template) => !isDefaultPlaceholderTemplate(template));
  return meaningfulTemplates.length ? meaningfulTemplates : templates;
}

function hasMeaningfulTemplates(templates: Partial<Template>[] | undefined) {
  if (!Array.isArray(templates) || !templates.length) return false;
  return templates.some((template) => !isDefaultPlaceholderTemplate(template));
}

function mergeSessionWorkspace(appState: AppState, workspace: Partial<AppState> | null | undefined) {
  if (!workspace || !Array.isArray(workspace.templates) || !workspace.templates.length) {
    return appState;
  }
  const templates = removeDefaultPlaceholderTemplates(
    workspace.templates.map((template, index) => normalizeTemplate(template, index))
  );
  const activeTemplateId = templates.some((template) => template.id === workspace.activeTemplateId)
    ? workspace.activeTemplateId || templates[0].id
    : templates[0].id;
  const activeDatasetId = appState.datasets.some((dataset) => dataset.id === workspace.activeDatasetId)
    ? workspace.activeDatasetId || ""
    : "";
  return {
    ...appState,
    templates,
    activeTemplateId,
    activeDatasetId
  };
}

function loadState() {
  try {
    let nextState = createInitialState();
    let savedTemplateUpdateTime = 0;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsedSaved = JSON.parse(saved) as Partial<AppState>;
      savedTemplateUpdateTime = hasMeaningfulTemplates(parsedSaved.templates)
        ? latestTemplateUpdateTime(parsedSaved.templates)
        : 0;
      const normalizedSaved = normalizeAppState(parsedSaved);
      nextState = mergePersistedLibraries(nextState, normalizedSaved);
    }
    const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    const sessionWorkspace = isAdminRoute ? sessionStorage.getItem(WORKSPACE_SESSION_KEY) : null;
    if (sessionWorkspace) {
      const parsedSession = JSON.parse(sessionWorkspace) as Partial<AppState>;
      if (latestTemplateUpdateTime(parsedSession.templates) >= savedTemplateUpdateTime) {
        nextState = mergeSessionWorkspace(nextState, parsedSession);
      }
    }
    return nextState;
  } catch {
    return createInitialState();
  }
}

function useImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    setImage(null);
    if (!src) {
      return () => {
        active = false;
      };
    }
    loadHtmlImage(src)
      .then((loaded) => {
        if (active) setImage(loaded);
      })
      .catch(() => {
        if (active) setImage(null);
      });
    return () => {
      active = false;
    };
  }, [src]);

  return image;
}

function getCoverCrop(
  image: { width: number; height: number } | null,
  width: number,
  height: number,
  focusX = 0.5,
  focusY = 0.5,
  zoom = IMAGE_CROP_MIN_ZOOM
) {
  if (!image) return undefined;
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  const cropZoom = clampImageCropZoom(zoom);
  if (imageRatio > canvasRatio) {
    const cropWidth = Math.max(1, (image.height * canvasRatio) / cropZoom);
    const cropHeight = Math.max(1, image.height / cropZoom);
    const maxX = Math.max(0, image.width - cropWidth);
    const maxY = Math.max(0, image.height - cropHeight);
    return {
      x: maxX * clamp01(focusX),
      y: maxY * clamp01(focusY),
      width: cropWidth,
      height: cropHeight
    };
  }
  const cropWidth = Math.max(1, image.width / cropZoom);
  const cropHeight = Math.max(1, (image.width / canvasRatio) / cropZoom);
  const maxX = Math.max(0, image.width - cropWidth);
  const maxY = Math.max(0, image.height - cropHeight);
  return {
    x: maxX * clamp01(focusX),
    y: maxY * clamp01(focusY),
    width: cropWidth,
    height: cropHeight
  };
}

function getCoverImageContentRect(
  image: { width: number; height: number } | null,
  width: number,
  height: number,
  focusX = 0.5,
  focusY = 0.5,
  zoom = IMAGE_CROP_MIN_ZOOM
) {
  const crop = getCoverCrop(image, width, height, focusX, focusY, zoom);
  if (!image || !crop) return null;
  const scaleX = width / crop.width;
  const scaleY = height / crop.height;
  return {
    x: -crop.x * scaleX,
    y: -crop.y * scaleY,
    width: image.width * scaleX,
    height: image.height * scaleY
  };
}

function getContainedImageSize(
  image: Pick<TemplateImage, "width" | "height">,
  maxWidth: number,
  maxHeight: number
) {
  const naturalWidth = normalizePositiveNumber(image.width, maxWidth);
  const naturalHeight = normalizePositiveNumber(image.height, maxHeight);
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  return {
    width: Math.max(24, Math.round(naturalWidth * scale)),
    height: Math.max(24, Math.round(naturalHeight * scale))
  };
}

function formatLayerValue(layer: TextLayer, row: RowData | undefined) {
  let value =
    typeof layer.content === "string"
      ? layer.content || "Text"
      : row?.[layer.column] || `{${layer.column}}`;
  if (layer.textTransform === "uppercase") value = value.toUpperCase();
  if (layer.textTransform === "lowercase") value = value.toLowerCase();
  return value;
}

function getExportName(template: Template, row: RowData | undefined, keyColumn: string) {
  const key = row?.[keyColumn] || "preview";
  return toFileSlug(`${template.name}_${key}`) || "onehousing_image";
}

function normalizeBox(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: box.width < 0 ? box.x + box.width : box.x,
    y: box.height < 0 ? box.y + box.height : box.y,
    width: Math.abs(box.width),
    height: Math.abs(box.height)
  };
}

function boxesIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  tolerance = 0
) {
  return (
    a.x <= b.x + b.width + tolerance &&
    a.x + a.width >= b.x - tolerance &&
    a.y <= b.y + b.height + tolerance &&
    a.y + a.height >= b.y - tolerance
  );
}

function ProjectDesignThumbnail({ template }: { template: Template }) {
  const width = Math.max(1, template.width);
  const height = Math.max(1, template.height);
  const clipPrefix = template.id.replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      className="project-design-preview-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={template.name}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      {template.backgroundDataUrl ? (
        <image
          href={getPreviewImageSrc(template.backgroundDataUrl, 720)}
          x="0"
          y="0"
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {template.layers.map((layer) => {
        if (isShapeLayer(layer)) {
          const layerWidth = Math.max(1, layer.width);
          const layerHeight = Math.max(1, layer.height || layer.width);
          const opacity = layer.opacity ?? 1;
          const strokeWidth = layer.strokeWidth || 0;
          const fill = layer.fill || "#e9f8ff";
          const stroke = layer.stroke || "transparent";
          const cornerRadius = getShapeCornerRadius(layer, layerWidth, layerHeight);
          const customRadii = Array.isArray(cornerRadius) ? getLayerCornerRadii(layer) : null;
          const radius = typeof cornerRadius === "number" ? cornerRadius : 0;
          const clipId = `thumb-${clipPrefix}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

          if (layer.imageDataUrl) {
            return (
              <g key={layer.id} opacity={opacity}>
                <defs>
                  <clipPath id={clipId}>
                    {layer.shapeVariant === "circle" ? (
                      <circle
                        cx={layer.x + layerWidth / 2}
                        cy={layer.y + layerHeight / 2}
                        r={Math.min(layerWidth, layerHeight) / 2}
                      />
                    ) : (
                      customRadii ? (
                        <path d={roundedRectPath(layer.x, layer.y, layerWidth, layerHeight, customRadii)} />
                      ) : (
                        <rect
                          x={layer.x}
                          y={layer.y}
                          width={layerWidth}
                          height={layerHeight}
                          rx={radius}
                          ry={radius}
                        />
                      )
                    )}
                  </clipPath>
                </defs>
                <image
                  href={getPreviewImageSrc(layer.imageDataUrl, 720)}
                  x={layer.x}
                  y={layer.y}
                  width={layerWidth}
                  height={layerHeight}
                  preserveAspectRatio={layer.imageUsage === "standalone" ? "none" : "xMidYMid slice"}
                  clipPath={`url(#${clipId})`}
                />
                {strokeWidth ? (
                  layer.shapeVariant === "circle" ? (
                    <circle
                      cx={layer.x + layerWidth / 2}
                      cy={layer.y + layerHeight / 2}
                      r={Math.min(layerWidth, layerHeight) / 2}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                    />
                  ) : (
                    customRadii ? (
                      <path
                        d={roundedRectPath(layer.x, layer.y, layerWidth, layerHeight, customRadii)}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                      />
                    ) : (
                      <rect
                        x={layer.x}
                        y={layer.y}
                        width={layerWidth}
                        height={layerHeight}
                        rx={radius}
                        ry={radius}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                      />
                    )
                  )
                ) : null}
              </g>
            );
          }

          return layer.shapeVariant === "circle" ? (
            <circle
              key={layer.id}
              cx={layer.x + layerWidth / 2}
              cy={layer.y + layerHeight / 2}
              r={Math.min(layerWidth, layerHeight) / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
          ) : (
            customRadii ? (
              <path
                key={layer.id}
                d={roundedRectPath(layer.x, layer.y, layerWidth, layerHeight, customRadii)}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            ) : (
              <rect
                key={layer.id}
                x={layer.x}
                y={layer.y}
                width={layerWidth}
                height={layerHeight}
                rx={radius}
                ry={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            )
          );
        }

        const textStyle: CSSProperties = {
          width: "100%",
          height: "100%",
          color: layer.color,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          fontStyle: layer.fontStyle || "normal",
          lineHeight: layer.lineHeight,
          letterSpacing: layer.letterSpacing,
          textAlign: layer.align,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        };
        const lineCount = Math.max(1, formatLayerValue(layer, undefined).split(/\r\n|\r|\n/).length);
        const textHeight = Math.max(layer.height || 0, layer.fontSize * layer.lineHeight * lineCount);

        return (
          <foreignObject
            key={layer.id}
            x={layer.x}
            y={layer.y}
            width={Math.max(1, layer.width)}
            height={Math.max(1, textHeight)}
            opacity={layer.opacity ?? 1}
          >
            <div style={textStyle}>
              {formatLayerValue(layer, undefined)}
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}

type ShapeLayerNodeProps = {
  layer: TextLayer;
  canDrag: boolean;
  onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onContextMenu: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onDblClick: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  isEditingImageCrop: boolean;
  onImageCropDragStart: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onImageCropDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onImageCropDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void;
  onTransform: (event: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>) => void;
  setNode: (node: Konva.Node | null) => void;
};

function ShapeLayerNode({
  layer,
  canDrag,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick,
  isEditingImageCrop,
  onImageCropDragStart,
  onImageCropDragMove,
  onImageCropDragEnd,
  onTransform,
  onTransformEnd,
  setNode
}: ShapeLayerNodeProps) {
  const image = useImage(layer.imageDataUrl || "");
  const framePlaceholderImage = useImage(
    layer.shapeVariant === "frame" && !layer.imageDataUrl ? DEFAULT_FRAME_PLACEHOLDER_DATA_URL : ""
  );
  const width = layer.width;
  const height = layer.height || layer.width;
  const renderedImage = image || framePlaceholderImage;
  const crop =
    renderedImage && layer.imageUsage !== "standalone"
      ? getCoverCrop(
          renderedImage,
          width,
          height,
          layer.imageCropFocusX,
          layer.imageCropFocusY,
          layer.imageCropZoom
        )
      : undefined;
  const cornerRadius = getShapeCornerRadius(layer, width, height);
  const commonProps = {
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation || 0,
    width,
    height,
    draggable: isEditingImageCrop ? Boolean(layer.imageDataUrl) : canDrag,
    opacity: layer.opacity ?? 1,
    onMouseDown: onSelect,
    onTap: onSelect,
    onContextMenu,
    onDblClick,
    onDblTap: onDblClick,
    onDragStart: isEditingImageCrop ? onImageCropDragStart : onDragStart,
    onDragMove: isEditingImageCrop ? onImageCropDragMove : onDragMove,
    onDragEnd: isEditingImageCrop ? onImageCropDragEnd : onDragEnd,
    onTransform,
    onTransformEnd
  };

  if (renderedImage) {
    return (
      <KonvaImage
        {...commonProps}
        ref={(node) => setNode(node)}
        image={renderedImage}
        crop={crop}
        cornerRadius={cornerRadius}
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth || 0}
      />
    );
  }

  return (
    <Rect
      {...commonProps}
      ref={(node) => setNode(node)}
      fill={layer.fill || "#8b3dff"}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth || 0}
      cornerRadius={cornerRadius}
    />
  );
}

function styleTransformerAnchor(anchor: Konva.Rect) {
  if (!anchor.hasName("rotater")) return;
  anchor.setAttrs({
    width: 22,
    height: 22,
    offsetX: 11,
    offsetY: 11,
    cornerRadius: 11,
    fill: "#ffffff",
    stroke: "#cbd5e1",
    strokeWidth: 1,
    shadowColor: "#0f172a",
    shadowBlur: 8,
    shadowOpacity: 0.16,
    shadowOffsetY: 2
  });
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

function blurActiveEditableTarget() {
  if (isEditableTarget(document.activeElement)) {
    (document.activeElement as HTMLElement).blur();
  }
}

export default function App() {
  const initialProjectRoute =
    typeof window !== "undefined" ? getProjectRouteFromPath(window.location.pathname) : null;
  const [appState, setAppStateBase] = useState<AppState>(() => {
    const loadedState = loadState();
    if (
      initialProjectRoute?.kind === "design-detail" &&
      loadedState.templates.some((item) => item.id === initialProjectRoute.id)
    ) {
      return { ...loadedState, activeTemplateId: initialProjectRoute.id };
    }
    return loadedState;
  });
  const isAdminPath = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(["layer_code"]);
  const [isAdmin, setIsAdmin] = useState(() => shouldRestoreLocalAdminSession());
  const isAdminWorkspace = isAdmin && isAdminPath;
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pagePendingDeleteId, setPagePendingDeleteId] = useState<string | null>(null);
  const [adminAccount, setAdminAccount] = useState(() => getStoredAdminAccount());
  const [adminLoginName, setAdminLoginName] = useState(() => getStoredAdminAccount());
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [adminSettingsName, setAdminSettingsName] = useState(() => getStoredAdminAccount());
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminSettingsMessage, setAdminSettingsMessage] = useState("");
  const [adminSettingsError, setAdminSettingsError] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("admin");
  const [adminName, setAdminName] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [showAccountManagerPage, setShowAccountManagerPage] = useState(false);
  const [accountUsers, setAccountUsers] = useState<AdminUser[]>([]);
  const [accountUsersLoading, setAccountUsersLoading] = useState(false);
  const [accountManagerError, setAccountManagerError] = useState("");
  const [accountManagerMessage, setAccountManagerMessage] = useState("");
  const [accountManagerBusy, setAccountManagerBusy] = useState(false);
  const [showCreateMemberForm, setShowCreateMemberForm] = useState(false);
  const [newMemberAccount, setNewMemberAccount] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [memberPendingDeleteId, setMemberPendingDeleteId] = useState<string | null>(null);
  const [memberResetPasswordId, setMemberResetPasswordId] = useState<string | null>(null);
  const [memberResetPassword, setMemberResetPassword] = useState("");
  const [editingOwnNameDraft, setEditingOwnNameDraft] = useState<string | null>(null);
  const isSuperAdmin = adminRole === "super_admin";
  const adminDisplayName = isSuperAdmin ? SUPER_ADMIN_NAME : adminName.trim() || adminAccount;
  const [showDatasetLibraryModal, setShowDatasetLibraryModal] = useState(false);
  const [showDataImportModal, setShowDataImportModal] = useState(false);
  const [isDataImportInline, setIsDataImportInline] = useState(false);
  const [showTemplateLibraryModal, setShowTemplateLibraryModal] = useState(
    Boolean(initialProjectRoute && initialProjectRoute.kind !== "design-detail")
  );
  const [clientDraftTemplate, setClientDraftTemplate] = useState<Template | null>(null);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);
  const [showFontLibraryModal, setShowFontLibraryModal] = useState(false);
  const [fontLibraryError, setFontLibraryError] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [previewDatasetId, setPreviewDatasetId] = useState<string | null>(null);
  const [datasetSearch, setDatasetSearch] = useState("");
  const [datasetLibraryError, setDatasetLibraryError] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [pendingProjectImageDeleteIds, setPendingProjectImageDeleteIds] = useState<string[]>([]);
  const [selectedTemplateFolderId, setSelectedTemplateFolderId] = useState(DEFAULT_TEMPLATE_FOLDER_ID);
  const [selectedPickerFolderId, setSelectedPickerFolderId] = useState(DEFAULT_TEMPLATE_FOLDER_ID);
  const [selectedImageFolderId, setSelectedImageFolderId] = useState(DEFAULT_TEMPLATE_FOLDER_ID);
  const [selectedProjectImageFolderId, setSelectedProjectImageFolderId] = useState("");
  const [selectedPanelImageFolderId, setSelectedPanelImageFolderId] = useState("");
  const [selectedPickerImageFolderId, setSelectedPickerImageFolderId] = useState("");
  const [selectedPickerTemplateId, setSelectedPickerTemplateId] = useState<string | null>(null);
  const [editingTemplateFolderId, setEditingTemplateFolderId] = useState<string | null>(null);
  const [openTemplateFolderMenuId, setOpenTemplateFolderMenuId] = useState<string | null>(null);
  const [openImageFolderMenuId, setOpenImageFolderMenuId] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFolderId, setProjectFolderId] = useState<string | null>(
    initialProjectRoute?.kind === "folder-detail" ? initialProjectRoute.id : null
  );
  const [projectRouteAdmin, setProjectRouteAdmin] = useState(Boolean(initialProjectRoute?.admin));
  const [projectListingMode, setProjectListingMode] = useState<ProjectListingMode>(
    initialProjectRoute?.kind === "folders"
      ? "folders"
      : initialProjectRoute?.kind === "designs"
        ? "designs"
        : "home"
  );
  const [projectContentWidth, setProjectContentWidth] = useState(PROJECT_CONTENT_FALLBACK_WIDTH);
  const [projectDesignPage, setProjectDesignPage] = useState(1);
  const [projectFolderDetailTab, setProjectFolderDetailTab] = useState<ProjectFolderDetailTab>("designs");
  const [projectSortOrder, setProjectSortOrder] = useState<ProjectSortOrder>("newest");
  const [projectViewMode, setProjectViewMode] = useState<ProjectViewMode>("grid");
  const [imageSearch, setImageSearch] = useState("");
  const [imageSortOrder, setImageSortOrder] = useState<ProjectSortOrder>("newest");
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [isDesignsCollapsed, setIsDesignsCollapsed] = useState(false);
  const [pendingDesignFolderId, setPendingDesignFolderId] = useState<string | null>(null);
  const [newDesignName, setNewDesignName] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateImage | null>(null);
  const [pendingTemplateUploads, setPendingTemplateUploads] = useState<PendingTemplateUpload[]>([]);
  const [templateLibraryError, setTemplateLibraryError] = useState("");
  const [pendingDataset, setPendingDataset] = useState<PendingDataset | null>(null);
  const [publicSheetUrl, setPublicSheetUrl] = useState("");
  const [dataImportError, setDataImportError] = useState("");
  const [isReadingData, setIsReadingData] = useState(false);
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  const [isDraggingDataFile, setIsDraggingDataFile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [downloadToast, setDownloadToast] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const [showCornerRadiusPopover, setShowCornerRadiusPopover] = useState(false);
  const [layerContextMenu, setLayerContextMenu] = useState<{
    layerId: string;
    x: number;
    y: number;
  } | null>(null);
  const [pageSizeDraft, setPageSizeDraft] = useState({ name: "", width: "", height: "" });
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({
    status: "loading",
    message: "Đang kết nối cloud..."
  });
  const [exportMimeType, setExportMimeType] = useState<"image/png" | "image/jpeg">("image/png");
  const [exportScale, setExportScale] = useState<"1" | "0.5" | "0.75">("1");
  const [stageWidth, setStageWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeCanvasTool, setActiveCanvasTool] = useState<CanvasTool>("move");
  const [activeDesignPanel, setActiveDesignPanel] = useState<DesignPanel>("elements");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProjectAccountMenu, setShowProjectAccountMenu] = useState(false);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [inlineTextEditor, setInlineTextEditor] = useState<InlineTextEditor | null>(null);
  const [hoveredClientPrompt, setHoveredClientPrompt] = useState<{ text: string; x: number; y: number } | null>(null);
  const [imageCropEditLayerId, setImageCropEditLayerId] = useState<string | null>(null);
  const [imageCropPreviewFocus, setImageCropPreviewFocus] = useState<{
    layerId: string;
    x: number;
    y: number;
    zoom: number;
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const projectContentRef = useRef<HTMLElement>(null);
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const inlineTextEditorRef = useRef<HTMLTextAreaElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const projectAccountMenuRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const pageSizeMenuRef = useRef<HTMLDivElement>(null);
  const shapeWidthInputRef = useRef<HTMLInputElement>(null);
  const shapeHeightInputRef = useRef<HTMLInputElement>(null);
  const shapeRadiusInputRef = useRef<HTMLInputElement>(null);
  const layerRefs = useRef<Record<string, Konva.Node>>({});
  const imageCropGuideRectRef = useRef<Konva.Rect | null>(null);
  const imageCropGuideHandleRefs = useRef<Array<Konva.Circle | null>>([]);
  const imageCropGuideOverlayRef = useRef<HTMLDivElement | null>(null);
  const layerTransformOverlayRef = useRef<HTMLDivElement | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const isZoomShortcutPressedRef = useRef(false);
  const appStateRef = useRef(appState);
  const selectedLayerIdsRef = useRef(selectedLayerIds);
  const isAdminRef = useRef(isAdmin);
  const isAdminWorkspaceRef = useRef(false);
  const undoStackRef = useRef<AppState[]>([]);
  const redoStackRef = useRef<AppState[]>([]);
  const lastSessionTouchRef = useRef(0);
  const remoteSyncEnabledRef = useRef(false);
  const remoteStateReadyRef = useRef(false);
  const hasLoadedRemoteStateRef = useRef(false);
  const remoteStateUpdatedAtRef = useRef<string | null>(null);
  const skipNextRemoteSaveRef = useRef(false);
  const remoteSaveVersionRef = useRef(0);
  const lastCloudRefreshRef = useRef(0);
  const downloadToastTimeoutRef = useRef<number | null>(null);
  const canvasPanRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const zoomAnchorRef = useRef<{
    pointerX: number;
    pointerY: number;
    logicalX: number;
    logicalY: number;
  } | null>(null);
  const groupDragRef = useRef<{
    activeLayerId: string;
    startX: number;
    startY: number;
    positions: Record<string, { x: number; y: number }>;
  } | null>(null);
  const imageCropDragRef = useRef<{
    layerId: string;
    startPointer: { x: number; y: number };
    startFocusX: number;
    startFocusY: number;
    startZoom: number;
    nextFocusX: number;
    nextFocusY: number;
    nextZoom: number;
    lockedAbsolutePosition: { x: number; y: number };
  } | null>(null);
  const imageCropScaleRef = useRef<{
    layerId: string;
    startPointer: { x: number; y: number };
    startZoom: number;
    nextZoom: number;
    center: { x: number; y: number };
    startDistance: number;
  } | null>(null);

  function setAppState(updater: AppStateUpdater) {
    setAppStateBase((current) => {
      const nextState =
        typeof updater === "function" ? (updater as (state: AppState) => AppState)(current) : updater;
      if (nextState === current) return current;
      undoStackRef.current.push(current);
      if (undoStackRef.current.length > HISTORY_LIMIT) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      appStateRef.current = nextState;
      return nextState;
    });
    setHistoryVersion((current) => current + 1);
  }

  function undoLastChange() {
    const previousState = undoStackRef.current.pop();
    if (!previousState) return;
    setAppStateBase((current) => {
      redoStackRef.current.push(current);
      appStateRef.current = previousState;
      return previousState;
    });
    setInlineTextEditor(null);
    setSelectedLayerIds([]);
    setHistoryVersion((current) => current + 1);
  }

  function redoLastChange() {
    const nextState = redoStackRef.current.pop();
    if (!nextState) return;
    setAppStateBase((current) => {
      undoStackRef.current.push(current);
      if (undoStackRef.current.length > HISTORY_LIMIT) {
        undoStackRef.current.shift();
      }
      appStateRef.current = nextState;
      return nextState;
    });
    setInlineTextEditor(null);
    setSelectedLayerIds([]);
    setHistoryVersion((current) => current + 1);
  }

  const canonicalTemplate = useMemo(
    () =>
      appState.templates.find((item) => item.id === appState.activeTemplateId) ||
      appState.templates[0],
    [appState.activeTemplateId, appState.templates]
  );
  const template =
    !isAdminWorkspace &&
    !showTemplateLibraryModal &&
    clientDraftTemplate?.id === canonicalTemplate.id
      ? clientDraftTemplate
      : canonicalTemplate;
  const pagePendingDelete = pagePendingDeleteId
    ? appState.templates.find((item) => item.id === pagePendingDeleteId) || null
    : null;

  useEffect(() => {
    if (isAdminWorkspace || showTemplateLibraryModal) {
      setClientDraftTemplate(null);
      return;
    }
    setClientDraftTemplate({
      ...canonicalTemplate,
      layers: canonicalTemplate.layers.map((layer) => ({ ...layer }))
    });
    setImageCropEditLayerId(null);
    setImageCropPreviewFocus(null);
  }, [canonicalTemplate.id, isAdminWorkspace, showTemplateLibraryModal]);

  useEffect(() => {
    if (!showTemplateLibraryModal) return;
    const element = projectContentRef.current;
    if (!element) return;

    const updateContentWidth = () => {
      const style = window.getComputedStyle(element);
      const horizontalPadding =
        parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0");
      const contentWidth = Math.max(0, element.clientWidth - horizontalPadding);
      setProjectContentWidth(contentWidth || PROJECT_CONTENT_FALLBACK_WIDTH);
    };

    updateContentWidth();
    const resizeObserver = new ResizeObserver(updateContentWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [showTemplateLibraryModal]);

  const dataset = useMemo(
    () =>
      appState.datasets.find((item) => item.id === appState.activeDatasetId) ||
      EMPTY_DATASET,
    [appState.activeDatasetId, appState.datasets]
  );
  const hasSelectedDataset = Boolean(dataset.id);
  const previewDataset = useMemo(
    () =>
      previewDatasetId
        ? appState.datasets.find((item) => item.id === previewDatasetId) || null
        : null,
    [appState.datasets, previewDatasetId]
  );
  const visibleDatasets = useMemo(() => {
    const keyword = normalizeText(datasetSearch);
    if (!keyword) return appState.datasets;
    return appState.datasets.filter((item) => {
      const importedAt = new Date(item.importedAt).toLocaleDateString("vi-VN");
      return normalizeText(
        `${item.name} ${item.rows.length} ${item.columns.length} ${importedAt}`
      ).includes(keyword);
    });
  }, [appState.datasets, datasetSearch]);

  const flattenedTemplateFolders = useMemo(
    () => flattenTemplateFolders(appState.templateFolders),
    [appState.templateFolders]
  );
  const fallbackTemplateFolderId =
    appState.templateFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID;
  const activeTemplateFolderId = appState.templateFolders.some(
    (folder) => folder.id === selectedTemplateFolderId
  )
    ? selectedTemplateFolderId
    : fallbackTemplateFolderId;
  const activePickerFolderId = appState.templateFolders.some(
    (folder) => folder.id === selectedPickerFolderId
  )
    ? selectedPickerFolderId
    : activeTemplateFolderId;
  const activeImageFolderId = appState.templateFolders.some(
    (folder) => folder.id === selectedImageFolderId
  )
    ? selectedImageFolderId
    : fallbackTemplateFolderId;
  const currentTemplateFolderId = appState.templateFolders.some((folder) => folder.id === template.folderId)
    ? template.folderId
    : fallbackTemplateFolderId;
  const currentTemplateRootFolderId = getRootTemplateFolderId(
    appState.templateFolders,
    currentTemplateFolderId,
    fallbackTemplateFolderId
  );
  const currentTemplateFolder =
    appState.templateFolders.find((folder) => folder.id === currentTemplateFolderId) ||
    appState.templateFolders[0];
  const imagePanelFolderId = currentTemplateRootFolderId;
  const isAllProjectsView = activeTemplateFolderId === fallbackTemplateFolderId;
  const selectedTemplateFolder =
    appState.templateFolders.find((folder) => folder.id === activeTemplateFolderId) ||
    appState.templateFolders[0];
  const canCreateSubfolder = Boolean(selectedTemplateFolder && !selectedTemplateFolder.parentId);
  const selectedFolderChildren = appState.templateFolders.filter(
    (folder) => folder.parentId === activeTemplateFolderId
  );
  const templatesInSelectedFolder = appState.templateImages.filter(
    (item) =>
      (isAllProjectsView || item.folderId === activeTemplateFolderId) &&
      getTemplateLibraryImage(item)
  );
  const visibleTemplates = removeDefaultPlaceholderTemplates(appState.templates);
  const designsInSelectedFolder = visibleTemplates.filter(
    (item) => isAllProjectsView || item.folderId === activeTemplateFolderId
  );
  const activeProjectFolder = projectFolderId
    ? appState.templateFolders.find((folder) => folder.id === projectFolderId) || null
    : null;
  const activeProjectImageFolders = activeProjectFolder
    ? appState.imageFolders.filter((folder) => folder.projectFolderId === activeProjectFolder.id)
    : [];
  const activeProjectImageFolderId = activeProjectImageFolders.some(
    (folder) => folder.id === selectedProjectImageFolderId
  )
    ? selectedProjectImageFolderId
    : "";
  const panelImageFolders = appState.imageFolders.filter(
    (folder) => folder.projectFolderId === imagePanelFolderId
  );
  const activePanelImageFolderId = panelImageFolders.some(
    (folder) => folder.id === selectedPanelImageFolderId
  )
    ? selectedPanelImageFolderId
    : "";
  const pickerImageFolders = appState.imageFolders.filter(
    (folder) => folder.projectFolderId === activePickerFolderId
  );
  const activePickerImageFolderId = pickerImageFolders.some(
    (folder) => folder.id === selectedPickerImageFolderId
  )
    ? selectedPickerImageFolderId
    : "";
  const projectFolderChildren = appState.templateFolders.filter(
    (folder) => folder.parentId === (activeProjectFolder ? activeProjectFolder.id : null)
  );
  const visibleManagementFolders = useMemo(
    () =>
      [...projectFolderChildren].sort((left, right) => {
        const rightActivity = getFolderLatestActivity(
          right.id,
          appState.templateFolders,
          visibleTemplates,
          appState.templateImages
        );
        const leftActivity = getFolderLatestActivity(
          left.id,
          appState.templateFolders,
          visibleTemplates,
          appState.templateImages
        );
        if (rightActivity !== leftActivity) return rightActivity - leftActivity;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [appState.templateFolders, appState.templateImages, projectFolderChildren, visibleTemplates]
  );
  const projectSearchKeyword = normalizeText(projectSearch);
  const managementItems = useMemo(() => {
    const folderNameById = new Map(appState.templateFolders.map((folder) => [folder.id, folder.name]));
    const designs = visibleTemplates.map((item) => ({
      id: item.id,
      kind: "design" as const,
      name: item.name,
      folderId: item.folderId,
      folderName: folderNameById.get(item.folderId) || "Dự án",
      width: item.width,
      height: item.height,
      image: getTemplateLibraryImage(item),
      template: item,
      updatedAt: item.updatedAt
    }));
    const templateImages = appState.templateImages.map((item) => ({
      id: item.id,
      kind: "template" as const,
      name: item.name,
      folderId: item.folderId,
      folderName: folderNameById.get(item.folderId) || "Dự án",
      width: item.width,
      height: item.height,
      image: getTemplateLibraryImage(item),
      updatedAt: item.createdAt
    }));
    return [...designs, ...templateImages].sort(
      (left, right) => {
        const leftTime = new Date(left.updatedAt).getTime();
        const rightTime = new Date(right.updatedAt).getTime();
        return projectSortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
      }
    );
  }, [appState.templateFolders, appState.templateImages, visibleTemplates, projectSortOrder]);
  const activeProjectFolderDesignCount = activeProjectFolder
    ? visibleTemplates.filter((item) => item.folderId === activeProjectFolder.id).length
    : 0;
  const activeProjectFolderImageCount = activeProjectFolder
    ? appState.templateImages.filter((item) => item.folderId === activeProjectFolder.id).length
    : 0;
  const visibleManagementItems = managementItems.filter((item) => {
    if (activeProjectFolder && item.folderId !== activeProjectFolder.id) return false;
    if (activeProjectFolder) {
      if (projectFolderDetailTab === "designs" && item.kind !== "design") return false;
      if (projectFolderDetailTab === "images" && item.kind !== "template") return false;
      if (
        projectFolderDetailTab === "images" &&
        activeProjectImageFolderId &&
        item.kind === "template" &&
        appState.templateImages.find((image) => image.id === item.id)?.imageFolderId !== activeProjectImageFolderId
      ) {
        return false;
      }
    } else if (item.kind !== "design") {
      return false;
    }
    if (!projectSearchKeyword) return true;
    return normalizeText(item.name).includes(projectSearchKeyword);
  });
  const visibleProjectFolders =
    projectSearchKeyword && !activeProjectFolder
      ? visibleManagementFolders.filter((folder) =>
          normalizeText(folder.name).includes(projectSearchKeyword)
        )
      : visibleManagementFolders;
  const isProjectHomeView = !activeProjectFolder && projectListingMode === "home";
  const isAdminProjectRootHome = isAdmin && projectRouteAdmin && isProjectHomeView;
  const isClientProjectLibrary = !(isAdmin && projectRouteAdmin && showTemplateLibraryModal);
  const showProjectFoldersSection = !isClientProjectLibrary && (activeProjectFolder
    ? Boolean(visibleProjectFolders.length)
    : projectListingMode !== "designs");
  const showProjectDesignsSection =
    !isAdminProjectRootHome && (isClientProjectLibrary || projectListingMode !== "folders");
  const projectFolderPreviewLimit = getTwoRowPreviewLimit(
    projectContentWidth,
    PROJECT_FOLDER_CARD_MIN_WIDTH,
    PROJECT_FOLDER_CARD_GAP
  );
  const projectDesignPreviewLimit = getTwoRowPreviewLimit(
    projectContentWidth,
    PROJECT_DESIGN_CARD_MIN_WIDTH,
    PROJECT_DESIGN_CARD_GAP
  );
  const projectFolderDetailPageSize = getGridItemLimit(
    projectContentWidth,
    PROJECT_DESIGN_CARD_MIN_WIDTH,
    PROJECT_DESIGN_CARD_GAP,
    PROJECT_FOLDER_DETAIL_ROWS
  );
  const projectFolderDetailPageCount = activeProjectFolder
    ? Math.max(1, Math.ceil(visibleManagementItems.length / projectFolderDetailPageSize))
    : 1;
  const currentProjectDesignPage = Math.min(projectDesignPage, projectFolderDetailPageCount);
  const projectFolderDetailPageStart = (currentProjectDesignPage - 1) * projectFolderDetailPageSize;
  const displayedProjectFolders = isProjectHomeView && !isAdminProjectRootHome
    ? visibleProjectFolders.slice(0, projectFolderPreviewLimit)
    : visibleProjectFolders;
  const displayedManagementItems = isProjectHomeView
    ? visibleManagementItems.slice(0, projectDesignPreviewLimit)
    : activeProjectFolder
      ? visibleManagementItems.slice(
          projectFolderDetailPageStart,
          projectFolderDetailPageStart + projectFolderDetailPageSize
        )
      : visibleManagementItems;
  const showProjectDesignPagination =
    Boolean(activeProjectFolder) && visibleManagementItems.length > projectFolderDetailPageSize;
  const showAllProjectFoldersButton =
    isProjectHomeView && !isAdminProjectRootHome && visibleProjectFolders.length > projectFolderPreviewLimit;
  const showAllProjectDesignsButton =
    isProjectHomeView && !isAdminProjectRootHome && visibleManagementItems.length > projectDesignPreviewLimit;
  const showProjectViewToggle = Boolean(activeProjectFolder) || projectListingMode === "designs";
  const projectDesignListClass =
    showProjectViewToggle && projectViewMode === "list" ? "project-design-list" : "project-design-grid";
  const canSelectProjectImages = Boolean(
    isAdmin && projectRouteAdmin && showTemplateLibraryModal && activeProjectFolder && projectFolderDetailTab === "images"
  );
  const activeProjectImageIdSet = new Set(
    activeProjectFolder
      ? appState.templateImages
          .filter((item) => item.folderId === activeProjectFolder.id)
          .map((item) => item.id)
      : []
  );
  const selectedProjectImageIds = canSelectProjectImages
    ? selectedTemplateIds.filter((id) => activeProjectImageIdSet.has(id))
    : [];
  const selectedProjectImageCount = selectedProjectImageIds.length;
  const projectPageTitle = activeProjectFolder
    ? activeProjectFolder.name
    : isClientProjectLibrary
      ? "T\u1ea5t c\u1ea3 thi\u1ebft k\u1ebf"
      : projectListingMode === "folders"
      ? "Tất cả dự án"
      : projectListingMode === "designs"
        ? "Tất cả thiết kế"
        : "Tất cả dự án";

  useEffect(() => {
    setProjectDesignPage(1);
  }, [projectFolderId, projectSearch, projectSortOrder, projectFolderDetailTab]);

  useEffect(() => {
    setSelectedTemplateIds([]);
  }, [projectFolderId, projectFolderDetailTab]);

  useEffect(() => {
    setProjectFolderDetailTab("designs");
  }, [projectFolderId]);

  useEffect(() => {
    setProjectDesignPage((current) => Math.min(current, projectFolderDetailPageCount));
  }, [projectFolderDetailPageCount]);

  useEffect(() => {
    const handlePopState = () => {
      applyProjectRoute(getProjectRouteFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [appState.templates, fallbackTemplateFolderId]);

  const templatesInPickerFolder = appState.templateImages.filter(
    (item) =>
      item.folderId === activePickerFolderId &&
      (!activePickerImageFolderId || item.imageFolderId === activePickerImageFolderId) &&
      getTemplateLibraryImage(item)
  );
  const imagesInActiveFolder = appState.templateImages.filter(
    (item) =>
      item.folderId === imagePanelFolderId &&
      (!activePanelImageFolderId || item.imageFolderId === activePanelImageFolderId) &&
      getTemplateLibraryImage(item)
  );
  const imageSearchKeyword = normalizeText(imageSearch);
  const visiblePanelImages = imagesInActiveFolder
    .filter((item) => !imageSearchKeyword || normalizeText(item.name).includes(imageSearchKeyword))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return imageSortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
    });
  const selectedPickerTemplate = selectedPickerTemplateId
    ? appState.templateImages.find((item) => item.id === selectedPickerTemplateId) || null
    : null;
  const isManagementPageOpen =
    showTemplateLibraryModal || showDatasetLibraryModal || showFontLibraryModal;

  const selectedRow = hasSelectedDataset
    ? dataset.rows[selectedRowIndex] || dataset.rows[0]
    : undefined;
  const selectedLayers = template.layers.filter((layer) => selectedLayerIds.includes(layer.id));
  const selectedLayer = selectedLayers[0] || null;
  const hasMultiSelection = selectedLayers.length > 1;
  const selectedLayerIsShape = isShapeLayer(selectedLayer);
  const selectedLayerIsStandaloneImage = isStandaloneImageLayer(selectedLayer);
  const selectionHasShape = selectedLayers.some((layer) => isShapeLayer(layer));
  const selectionHasRotatableImage = selectedLayers.some(
    (layer) => isShapeLayer(layer) && Boolean(layer.imageDataUrl)
  );
  const selectedShapeWidth = Math.round(selectedLayer?.width ?? 0);
  const selectedShapeHeight = Math.round(selectedLayer?.height ?? selectedLayer?.width ?? 0);
  const selectedShapeCornerRadii = selectedLayerIsShape && selectedLayer
    ? getLayerCornerRadii(selectedLayer)
    : cornerRadiiFromUniform(0);
  const selectedShapeCornersAreUniform = areCornerRadiiUniform(selectedShapeCornerRadii);
  const selectedShapeRadius = Math.round(
    selectedLayer?.shapeVariant === "circle"
      ? Math.min(selectedShapeWidth, selectedShapeHeight) / 2
      : getCornerRadiusPreviewValue(selectedLayer || FALLBACK_TEXT_LAYER)
  );
  const imageCropEditLayer = imageCropEditLayerId
    ? template.layers.find((layer) => layer.id === imageCropEditLayerId) || null
    : null;
  const imageCropGuideRect =
    imageCropEditLayer &&
    isShapeLayer(imageCropEditLayer) &&
    imageCropEditLayer.imageDataUrl &&
    imageCropEditLayer.shapeVariant === "frame"
      ? (() => {
          if (!imageCropEditLayer.imageOriginalWidth || !imageCropEditLayer.imageOriginalHeight) {
            return {
              x: imageCropEditLayer.x,
              y: imageCropEditLayer.y,
              width: imageCropEditLayer.width,
              height: imageCropEditLayer.height || imageCropEditLayer.width
            };
          }
          const previewFocus =
            imageCropPreviewFocus?.layerId === imageCropEditLayer.id ? imageCropPreviewFocus : null;
          const rect = getCoverImageContentRect(
            {
              width: imageCropEditLayer.imageOriginalWidth,
              height: imageCropEditLayer.imageOriginalHeight
            },
            imageCropEditLayer.width,
            imageCropEditLayer.height || imageCropEditLayer.width,
            previewFocus?.x ?? imageCropEditLayer.imageCropFocusX,
            previewFocus?.y ?? imageCropEditLayer.imageCropFocusY,
            previewFocus?.zoom ?? imageCropEditLayer.imageCropZoom
          );
          return rect
            ? {
                x: imageCropEditLayer.x + rect.x,
                y: imageCropEditLayer.y + rect.y,
                width: rect.width,
                height: rect.height
              }
            : null;
        })()
      : null;
  const showLegacyImageCropGuide = false;
  useEffect(() => {
    setShowCornerRadiusPopover(false);
  }, [selectedLayer?.id, hasMultiSelection]);
  const selectedFontStyleOptions = useMemo(() => {
    const baseOptions = [
      ["100", "Thin 100"],
      ["200", "Extra Light 200"],
      ["300", "Light 300"],
      ["400", "Regular 400"],
      ["500", "Medium 500"],
      ["600", "Semi Bold 600"]
    ].map(([weight, label]) => ({
      value: `${weight}|normal`,
      label
    }));
    if (!selectedLayer) return baseOptions;
    const customOptions = appState.customFonts
      .filter((font) => font.family === selectedLayer.fontFamily)
      .map((font) => ({
        value: `${clampFontWeight(font.fontWeight)}|${font.fontStyle || "normal"}`,
        label: font.styleName || `${clampFontWeight(font.fontWeight)}${font.fontStyle === "italic" ? " Italic" : ""}`
      }));
    const uniqueOptions = Array.from(
      new Map(customOptions.map((option) => [option.value, option])).values()
    );
    const options = uniqueOptions.length ? uniqueOptions : baseOptions;
    const selectedValue = `${selectedLayer.fontWeight}|${selectedLayer.fontStyle || "normal"}`;
    return options.some((option) => option.value === selectedValue)
      ? options
      : [{ value: selectedValue, label: selectedValue.replace("|", " ") }, ...options];
  }, [appState.customFonts, selectedLayer]);
  const selectedFontStyleValue = selectedLayer
    ? `${selectedLayer.fontWeight}|${selectedLayer.fontStyle || "normal"}`
    : "";
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;
  const selectedOutlineColor = selectionHasShape
    ? "#8b3dff"
    : selectedLayers.some((layer) => typeof layer.content !== "string")
      ? "#dc2626"
      : "#256fe6";
  const backgroundImage = useImage(template.backgroundDataUrl);
  const backgroundCrop = getCoverCrop(backgroundImage, template.width, template.height);
  const availableFonts = Array.from(
    new Set([...BASE_FONTS, ...appState.customFonts.map((font) => font.family)])
  );
  const canEditWorkspace = true;
  const isAdminProjectManager = isAdmin && projectRouteAdmin && showTemplateLibraryModal;
  const isProjectCloudLoading = showTemplateLibraryModal && cloudSync.status === "loading";
  const canEditLayer = (layer: TextLayer | null | undefined) =>
    canEditWorkspace && canEditLayerForMode(layer, isAdminWorkspace);
  const canEditLayerById = (layerId: string) =>
    canEditLayer(template.layers.find((layer) => layer.id === layerId));
  const canUseShapeControls = (layer: TextLayer | null | undefined) =>
    canEditLayer(layer) ||
    (canEditWorkspace && !isAdminWorkspace && isShapeLayer(layer) && !isStandaloneImageLayer(layer));
  const canUseFrameSlot = (
    layer: TextLayer | null | undefined
  ): layer is TextLayer & { kind: "shape" } =>
    canEditWorkspace &&
    isShapeLayer(layer) &&
    layer.shapeVariant === "frame";
  const canUseFrameSlotById = (layerId: string) =>
    canUseFrameSlot(template.layers.find((layer) => layer.id === layerId));
  const selectedLayerCanEdit = canEditLayer(selectedLayer);
  const selectedLayerCanUseShapeControls = canUseShapeControls(selectedLayer);
  const selectedLayersCanEdit = Boolean(selectedLayers.length) && selectedLayers.every(canEditLayer);
  const editableSelectedLayers = selectedLayers.filter(canEditLayer);
  const canAddFreeTextLayer = canEditWorkspace;
  const canAddDataTextLayer = canEditWorkspace && isAdminWorkspace;
  const pendingTemplateUploadSaveCount = pendingTemplateUploads.filter(
    (upload) => upload.status !== "saved"
  ).length;
  const uploadedFontGroups = useMemo(() => {
    const groups = new Map<
      string,
      { family: string; styles: CustomFont[] }
    >();
    appState.customFonts.forEach((font) => {
      const group = groups.get(font.family) || {
        family: font.family,
        styles: []
      };
      group.styles.push(font);
      groups.set(font.family, group);
    });
    return Array.from(groups.values()).map((group) => ({
      ...group,
      styles: [...group.styles].sort((left, right) => {
        const leftWeight = Number(left.fontWeight || "400");
        const rightWeight = Number(right.fontWeight || "400");
        if (leftWeight !== rightWeight) return leftWeight - rightWeight;
        return (left.fontStyle || "normal").localeCompare(right.fontStyle || "normal");
      })
    }));
  }, [appState.customFonts]);

  const fitScale = useMemo(() => {
    if (!stageWidth || !stageHeight) return 0.5;
    const widthFit = (stageWidth - 76) / template.width;
    // In the default view, a selected layer reserves extra room above the
    // template for its toolbar. Include that space in the fit calculation so
    // the bottom of a tall template is not hidden behind the bottom controls.
    // Always reserve the property-toolbar area. The toolbar can then appear on
    // selection without resizing or shifting the fitted template.
    const propertyToolbarSpace = 64;
    const heightFit = (stageHeight - 110 - propertyToolbarSpace) / template.height;
    return Math.min(1, Math.max(0.08, Math.min(widthFit, heightFit)));
  }, [stageHeight, stageWidth, template.height, template.width]);
  const stageScale = fitScale * zoomLevel;
  // Keep the stage sized exactly to the template. Transform controls that need
  // to escape this boundary are rendered as overlays, not scrollable canvas.
  const transformControlBleed = 0;
  const zoomPercent = Math.round(zoomLevel * 100);

  useEffect(() => {
    let active = true;

    function mergeLocalBackupState(rawState: Partial<AppState> | null) {
      if (!active || !rawState) return;
      if (hasLoadedRemoteStateRef.current) return;
      const normalized = normalizeAppState(rawState);
      setAppStateBase((current) => {
        const backupTime = latestPersistedLibraryUpdateTime(normalized);
        const currentTime = latestPersistedLibraryUpdateTime(current);
        if (currentTime > backupTime) return current;
        const nextState = mergePersistedLibraries(current, normalized);
        appStateRef.current = nextState;
        return nextState;
      });
    }

    async function bootstrapIndexedDbState() {
      try {
        mergeLocalBackupState(await loadIndexedDbBackup());
      } catch {
        // Local IndexedDB backup is optional.
      }
    }

    async function bootstrapCloudState() {
      lastCloudRefreshRef.current = Date.now();
      try {
        const response = await fetchCloudState();
        const data = await readJsonResponse(response);
        if (!active) return;
        const isStateResponse =
          data !== null &&
          typeof data === "object" &&
          ("state" in data || "updatedAt" in data);
        if (!response.ok || !isStateResponse) {
          remoteSyncEnabledRef.current = false;
          remoteStateReadyRef.current = true;
          setCloudSync({
            status: "local",
            message: "Đang lưu trên trình duyệt"
          });
          return;
        }
        remoteSyncEnabledRef.current = true;
        remoteStateReadyRef.current = true;
        remoteStateUpdatedAtRef.current =
          (data as { updatedAt?: string | null } | null)?.updatedAt || null;
        const remoteState = (data as { state?: AppState | null } | null)?.state;
        if (remoteState) {
          hasLoadedRemoteStateRef.current = true;
          const normalized = normalizeAppState(remoteState);
          setAppStateBase((current) => {
            skipNextRemoteSaveRef.current = true;
            const nextState = mergePersistedLibraries(current, normalized);
            appStateRef.current = nextState;
            return nextState;
          });
        }
        setCloudSync({
          status: "saved",
          message: remoteState ? "Đã tải dữ liệu cloud" : "Cloud đã sẵn sàng"
        });
      } catch {
        if (!active) return;
        remoteSyncEnabledRef.current = false;
        remoteStateReadyRef.current = true;
        setCloudSync({
          status: "local",
          message: "Đang lưu trên trình duyệt"
        });
      }
    }

    async function restoreAdminSession() {
      try {
        const response = await fetch("/api/auth/session", { credentials: "include" });
        const data = (await readJsonResponse(response)) as {
          authenticated?: boolean;
          account?: string | null;
          name?: string | null;
          role?: string | null;
          id?: string | null;
        } | null;
        if (!active || !response.ok) return;
        if (!data?.authenticated) {
          if (!isLocalAdminFallbackAllowed()) {
            clearAdminSession();
            setIsAdmin(false);
          }
          return;
        }
        touchAdminSession();
        lastSessionTouchRef.current = Date.now();
        setIsAdmin(true);
        applyAdminIdentity(data);
        if (data.account) {
          localStorage.setItem(ADMIN_ACCOUNT_KEY, data.account);
          setAdminLoginName(data.account);
          setAdminSettingsName(data.account);
        }
      } catch {
        // Local admin fallback remains available.
      }
    }

    void bootstrapIndexedDbState();
    bootstrapCloudState();
    restoreAdminSession();
    const refreshCloudStateIfStale = () => {
      if (isAdminPath || Date.now() - lastCloudRefreshRef.current < 5000) return;
      void bootstrapCloudState();
    };
    const refreshCloudStateOnVisible = () => {
      if (document.visibilityState === "visible") refreshCloudStateIfStale();
    };
    const refreshLocalBackupFromStorage = (event: StorageEvent) => {
      if (isAdminPath || event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        mergeLocalBackupState(JSON.parse(event.newValue) as Partial<AppState>);
        void loadIndexedDbBackup().then(mergeLocalBackupState).catch(() => undefined);
      } catch {
        // Ignore malformed local backup updates.
      }
    };
    window.addEventListener("focus", refreshCloudStateIfStale);
    window.addEventListener("storage", refreshLocalBackupFromStorage);
    document.addEventListener("visibilitychange", refreshCloudStateOnVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshCloudStateIfStale);
      window.removeEventListener("storage", refreshLocalBackupFromStorage);
      document.removeEventListener("visibilitychange", refreshCloudStateOnVisible);
    };
  }, []);

  useEffect(() => {
    if (!isAdminWorkspace) {
      setStorageWarning("");
      return;
    }
    const saveTimer = window.setTimeout(() => {
      void (async () => {
        let indexedDbSaved = false;
        try {
          await saveIndexedDbBackup(appState);
          indexedDbSaved = true;
        } catch {
          if (!remoteSyncEnabledRef.current) {
            setStorageWarning(
              "Không lưu được dữ liệu ảnh local vào trình duyệt. Hãy giảm dung lượng ảnh hoặc dùng production để lưu ảnh lên server."
            );
          }
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(appStateForLocalBackup(appState)));
          if (indexedDbSaved) setStorageWarning("");
        } catch {
          if (remoteSyncEnabledRef.current || indexedDbSaved) {
            setStorageWarning("");
            return;
          }
          setStorageWarning(
            "Không lưu được dữ liệu vào trình duyệt vì dung lượng ảnh quá lớn. Trang mới vẫn dùng được trong phiên hiện tại."
          );
        }
      })();
    }, 180);

    return () => window.clearTimeout(saveTimer);
  }, [appState, isAdminWorkspace]);

  useEffect(() => {
    try {
      if (!isAdminWorkspace) {
        sessionStorage.removeItem(WORKSPACE_SESSION_KEY);
        return;
      }
      sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(workspaceStateForSession(appState)));
    } catch {
      // Workspace is still available in memory for the current render session.
    }
  }, [appState.templates, appState.activeTemplateId, appState.activeDatasetId, isAdminWorkspace]);

  useEffect(() => {
    if (!remoteSyncEnabledRef.current || !remoteStateReadyRef.current || !isAdminWorkspace) return;
    if (skipNextRemoteSaveRef.current) {
      skipNextRemoteSaveRef.current = false;
      return;
    }

    const saveVersion = remoteSaveVersionRef.current + 1;
    remoteSaveVersionRef.current = saveVersion;
    setCloudSync({
      status: "saving",
      message: "Đang lưu cloud..."
    });
    const saveTimer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/state", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: persistedLibraryState(appState),
            baseUpdatedAt: remoteStateUpdatedAtRef.current
          })
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          if (response.status === 401) {
            expireAdminSession();
            return;
          }
          if (response.status === 409) {
            remoteStateUpdatedAtRef.current =
              (data as { updatedAt?: string | null } | null)?.updatedAt || remoteStateUpdatedAtRef.current;
            throw new Error("Dữ liệu cloud đã thay đổi, hãy tải lại trang trước khi lưu");
          }
          throw new Error(errorMessageFromApi(data, "Không lưu được Neon"));
        }
        remoteStateUpdatedAtRef.current =
          (data as { savedAt?: string | null } | null)?.savedAt || remoteStateUpdatedAtRef.current;
        if (remoteSaveVersionRef.current === saveVersion) {
          setCloudSync({
            status: "saved",
            message: "Đã lưu cloud"
          });
        }
      } catch (error) {
        if (remoteSaveVersionRef.current === saveVersion) {
          setCloudSync({
            status: "error",
            message: error instanceof Error ? error.message : "Lỗi lưu cloud"
          });
        }
      }
    }, 900);

    return () => window.clearTimeout(saveTimer);
  }, [
    appState.templates,
    appState.activeTemplateId,
    appState.templateFolders,
    appState.imageFolders,
    appState.templateImages,
    appState.datasets,
    appState.customFonts,
    isAdminWorkspace
  ]);


  useEffect(() => {
    appState.customFonts.forEach((font) => {
      registerFont(font).catch(() => undefined);
    });
  }, [appState.customFonts]);

  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const shell = canvasShellRef.current;
    if (!wrap && !shell) return;
    const resize = () => {
      const target = shell || wrap;
      if (!target) return;
      setStageWidth(target.clientWidth);
      setStageHeight(target.clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (wrap) observer.observe(wrap);
    if (shell) observer.observe(shell);
    return () => observer.disconnect();
  }, [appState.activeTemplateId, isManagementPageOpen]);

  useEffect(() => {
    const shell = canvasShellRef.current;
    if (!shell) return;

    const lockScrollWhileZooming = (event: WheelEvent) => {
      if (!isZoomShortcutPressedRef.current) return;
      event.preventDefault();
    };

    shell.addEventListener("wheel", lockScrollWhileZooming, { passive: false });
    return () => shell.removeEventListener("wheel", lockScrollWhileZooming);
  }, [appState.activeTemplateId, isManagementPageOpen]);

  useEffect(() => {
    const finishWindowSelection = (event: PointerEvent) => {
      if (!isSelectingRef.current) return;
      finishCanvasSelection(getLogicalPointFromClient(event.clientX, event.clientY));
    };

    window.addEventListener("pointerup", finishWindowSelection);
    window.addEventListener("pointercancel", finishWindowSelection);
    return () => {
      window.removeEventListener("pointerup", finishWindowSelection);
      window.removeEventListener("pointercancel", finishWindowSelection);
    };
  }, [stageScale, selectionBox, template.layers]);

  useEffect(() => {
    if (!showSettingsMenu) return;

    const closeSettingsMenuOnOutsideClick = (event: PointerEvent) => {
      const menu = settingsMenuRef.current;
      if (!menu || menu.contains(event.target as Node)) return;
      setShowSettingsMenu(false);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    document.addEventListener("pointerdown", closeSettingsMenuOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeSettingsMenuOnOutsideClick);
  }, [showSettingsMenu]);

  useEffect(() => {
    if (!showProjectAccountMenu) return;

    const closeProjectAccountMenuOnOutsideClick = (event: PointerEvent) => {
      const menu = projectAccountMenuRef.current;
      if (!menu || menu.contains(event.target as Node)) return;
      setShowProjectAccountMenu(false);
    };

    document.addEventListener("pointerdown", closeProjectAccountMenuOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeProjectAccountMenuOnOutsideClick);
  }, [showProjectAccountMenu]);

  useEffect(() => {
    if (!openImageFolderMenuId) return;

    const closeImageFolderMenuOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(".project-image-folder-chip")) return;
      setOpenImageFolderMenuId(null);
    };
    const closeImageFolderMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenImageFolderMenuId(null);
    };

    document.addEventListener("pointerdown", closeImageFolderMenuOnOutsideClick);
    document.addEventListener("keydown", closeImageFolderMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeImageFolderMenuOnOutsideClick);
      document.removeEventListener("keydown", closeImageFolderMenuOnEscape);
    };
  }, [openImageFolderMenuId]);

  useEffect(() => {
    if (!isAdminProjectManager || !activeProjectFolder || projectFolderDetailTab !== "images") return;

    const handlePasteImages = (event: ClipboardEvent) => {
      const filesFromList = Array.from(event.clipboardData?.files || []).filter((file) =>
        file.type.startsWith("image/")
      );
      const filesFromItems = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));
      const files = [...filesFromList, ...filesFromItems];
      if (!files.length) return;
      event.preventDefault();
      prepareProjectFolderImages(files);
    };

    document.addEventListener("paste", handlePasteImages);
    return () => document.removeEventListener("paste", handlePasteImages);
  }, [isAdminProjectManager, activeProjectFolder?.id, projectFolderDetailTab]);

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const shell = canvasShellRef.current;
    const stage = stageRef.current;
    if (!anchor || !shell || !stage) return;
    const shellRect = shell.getBoundingClientRect();
    const stageRect = stage.container().getBoundingClientRect();
    const nextLeft =
      stageRect.left -
      shellRect.left +
      shell.scrollLeft +
      anchor.logicalX * stageScale -
      anchor.pointerX;
    const nextTop =
      stageRect.top -
      shellRect.top +
      shell.scrollTop +
      anchor.logicalY * stageScale -
      anchor.pointerY;
    shell.scrollLeft = nextLeft;
    shell.scrollTop = nextTop;
    requestAnimationFrame(() => {
      shell.scrollLeft = nextLeft;
      shell.scrollTop = nextTop;
    });
    zoomAnchorRef.current = null;
  }, [zoomLevel, stageScale]);

  useEffect(() => {
    if (selectedRowIndex >= dataset.rows.length) {
      setSelectedRowIndex(0);
    }
  }, [dataset.rows.length, selectedRowIndex]);

  useEffect(() => {
    const fallbackFolderId = appState.templateFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID;
    if (!appState.templateFolders.some((folder) => folder.id === selectedTemplateFolderId)) {
      setSelectedTemplateFolderId(fallbackFolderId);
    }
    if (!appState.templateFolders.some((folder) => folder.id === selectedPickerFolderId)) {
      setSelectedPickerFolderId(fallbackFolderId);
    }
    if (!appState.templateFolders.some((folder) => folder.id === selectedImageFolderId)) {
      setSelectedImageFolderId(fallbackFolderId);
    }
    if (
      selectedProjectImageFolderId &&
      !appState.imageFolders.some((folder) => folder.id === selectedProjectImageFolderId)
    ) {
      setSelectedProjectImageFolderId("");
    }
    if (
      selectedPanelImageFolderId &&
      !appState.imageFolders.some((folder) => folder.id === selectedPanelImageFolderId)
    ) {
      setSelectedPanelImageFolderId("");
    }
    if (
      selectedPickerImageFolderId &&
      !appState.imageFolders.some(
        (folder) =>
          folder.id === selectedPickerImageFolderId && folder.projectFolderId === activePickerFolderId
      )
    ) {
      setSelectedPickerImageFolderId("");
    }
  }, [
    appState.templateFolders,
    appState.imageFolders,
    activePickerFolderId,
    selectedTemplateFolderId,
    selectedPickerFolderId,
    selectedImageFolderId,
    selectedProjectImageFolderId,
    selectedPanelImageFolderId,
    selectedPickerImageFolderId
  ]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (imageCropEditLayerId) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const nodes = selectedLayerIds
      .filter((id) => canEditLayerById(id))
      .map((id) => layerRefs.current[id])
      .filter(Boolean);
    transformer.nodes(nodes);
    transformer.forceUpdate();
    transformer.getLayer()?.batchDraw();
    syncSelectedLayerTransformOverlay();
  }, [
    imageCropEditLayerId,
    isAdminWorkspace,
    selectedLayerIds,
    template.layers
  ]);

  useEffect(() => {
    if (!inlineTextEditor) return;
    const editor = inlineTextEditorRef.current;
    if (!editor) return;
    editor.focus();
    editor.select();
  }, [inlineTextEditor?.layerId]);

  useEffect(() => {
    if (!inlineTextEditor) return;
    const layer = template.layers.find((item) => item.id === inlineTextEditor.layerId);
    if (!layer || typeof layer.content !== "string") {
      setInlineTextEditor(null);
    }
  }, [inlineTextEditor, template.layers]);

  useEffect(() => {
    appStateRef.current = appState;
    selectedLayerIdsRef.current = selectedLayerIds;
    isAdminRef.current = isAdmin;
    isAdminWorkspaceRef.current = isAdminWorkspace;
  }, [appState, selectedLayerIds, isAdmin, isAdminWorkspace]);

  useEffect(
    () => () => {
      if (downloadToastTimeoutRef.current) {
        window.clearTimeout(downloadToastTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!showDownloadMenu) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (downloadMenuRef.current?.contains(event.target as Node | null)) return;
      setShowDownloadMenu(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowDownloadMenu(false);
    }
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showDownloadMenu]);

  useEffect(() => {
    if (!showPageSizeMenu) return;
    setPageSizeDraft({
      name: template.name,
      width: String(template.width),
      height: String(template.height)
    });
  }, [showPageSizeMenu, template.id, template.name, template.width, template.height]);

  useEffect(() => {
    if (!showPageSizeMenu) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (pageSizeMenuRef.current?.contains(event.target as Node | null)) return;
      setShowPageSizeMenu(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowPageSizeMenu(false);
    }
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showPageSizeMenu]);

  useEffect(() => {
    if (!layerContextMenu) return;

    const closeLayerContextMenu = () => setLayerContextMenu(null);
    const closeLayerContextMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayerContextMenu(null);
    };

    window.addEventListener("pointerdown", closeLayerContextMenu);
    window.addEventListener("keydown", closeLayerContextMenuOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeLayerContextMenu);
      window.removeEventListener("keydown", closeLayerContextMenuOnEscape);
    };
  }, [layerContextMenu]);

  useEffect(() => {
    if (!isAdmin) return;

    function handleAdminActivity() {
      const lastActivity = Number(localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY) || 0);
      if (!lastActivity || Date.now() - lastActivity > ADMIN_IDLE_TIMEOUT_MS) {
        logoutAdmin();
        return;
      }
      const now = Date.now();
      if (now - lastSessionTouchRef.current > 60_000) {
        touchAdminSession();
        lastSessionTouchRef.current = now;
      }
    }

    handleAdminActivity();
    window.addEventListener("pointerdown", handleAdminActivity);
    window.addEventListener("keydown", handleAdminActivity);
    window.addEventListener("focus", handleAdminActivity);
    return () => {
      window.removeEventListener("pointerdown", handleAdminActivity);
      window.removeEventListener("keydown", handleAdminActivity);
      window.removeEventListener("focus", handleAdminActivity);
    };
  }, [isAdmin]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const isControlShortcut = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && imageCropDragRef.current) {
        event.preventDefault();
        imageCropDragRef.current = null;
        imageCropScaleRef.current = null;
        resetCanvasCursor();
        setImageCropPreviewFocus(null);
        setImageCropEditLayerId(null);
        return;
      }
      if (event.key === "Escape" && imageCropScaleRef.current) {
        event.preventDefault();
        imageCropScaleRef.current = null;
        resetCanvasCursor();
        setImageCropPreviewFocus(null);
        setImageCropEditLayerId(null);
        return;
      }
      if (event.key === "Escape" && imageCropEditLayerId) {
        event.preventDefault();
        imageCropScaleRef.current = null;
        resetCanvasCursor();
        setImageCropPreviewFocus(null);
        setImageCropEditLayerId(null);
        return;
      }
      if (isControlShortcut && key === "z") {
        event.preventDefault();
        undoLastChange();
        return;
      }
      const selectedIds = selectedLayerIdsRef.current;
      if (isControlShortcut && key === "d" && isAdminWorkspace && selectedIds.length) {
        event.preventDefault();
        duplicateSelectedLayers();
        return;
      }
      if (isControlShortcut && key === "y") {
        event.preventDefault();
        redoLastChange();
        return;
      }
      if (event.key.toLowerCase() === "z") {
        isZoomShortcutPressedRef.current = true;
        return;
      }

      const toolShortcuts: Record<string, CanvasTool> = {
        v: "move",
        h: "hand",
        t: "text"
      };
      const shortcutTool = toolShortcuts[event.key.toLowerCase()];
      if (shortcutTool) {
        event.preventDefault();
        setActiveCanvasTool(shortcutTool);
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedIds.length
      ) {
        event.preventDefault();
        const selectedIdSet = new Set(selectedIds);
        updateTemplate((current) => {
          const layers = current.layers.filter(
            (layer) =>
              !selectedIdSet.has(layer.id) ||
              !canEditLayerForMode(layer, isAdminWorkspaceRef.current)
          );
          return layers.length === current.layers.length
            ? current
            : {
                ...current,
                updatedAt: new Date().toISOString(),
                layers
              };
        });
        setSelectedLayerIds((current) =>
          current.filter((id) => {
            const layer = template.layers.find((item) => item.id === id);
            return layer && !canEditLayerForMode(layer, isAdminWorkspaceRef.current);
          })
        );
        return;
      }

      if (
        isControlShortcut &&
        (event.key === "ArrowUp" || event.key === "ArrowDown") &&
        selectedIds.length
      ) {
        event.preventDefault();
        const targetLayerId = selectedIds[selectedIds.length - 1];
        if (event.shiftKey) {
          moveLayerOrder(targetLayerId, event.key === "ArrowUp" ? "front" : "back");
        } else {
          moveLayerOrder(targetLayerId, event.key === "ArrowUp" ? "forward" : "backward");
        }
        return;
      }

      const arrowMoves: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }
      };
      const move = arrowMoves[event.key];
      if (!move || !selectedIds.length) {
        return;
      }

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const selectedIdSet = new Set(selectedIds);
      updateTemplate((current) => {
        let didMove = false;
        const layers = current.layers.map((layer) => {
          if (!selectedIdSet.has(layer.id) || !canEditLayerForMode(layer, isAdminWorkspaceRef.current)) {
            return layer;
          }
          didMove = true;
          return {
            ...layer,
            x: Math.round(layer.x + move.x * step),
            y: Math.round(layer.y + move.y * step)
          };
        });
        return didMove
          ? {
              ...current,
              updatedAt: new Date().toISOString(),
              layers
            }
          : current;
      });
      requestAnimationFrame(() => transformerRef.current?.forceUpdate());
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "z") {
        isZoomShortcutPressedRef.current = false;
      }
    };
    const resetShortcut = () => {
      isZoomShortcutPressedRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetShortcut);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetShortcut);
    };
  }, [imageCropEditLayerId, isAdminWorkspace, selectedLayerIds, template.id, template.layers]);

  function updateTemplate(updater: (template: Template) => Template) {
    if (!isAdminWorkspace) {
      setClientDraftTemplate((current) => {
        const baseTemplate = current?.id === template.id ? current : template;
        return updater(baseTemplate);
      });
      return;
    }
    setAppState((current) => ({
      ...current,
      templates: current.templates.map((item) =>
        item.id === template.id ? updater(item) : item
      )
    }));
  }

  function updateSelectedLayer(patch: Partial<TextLayer>) {
    if (!selectedLayerIds.length) return;
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((layer) =>
        selectedLayerIds.includes(layer.id) &&
        (canEditLayerForMode(layer, isAdminWorkspace) ||
          (!isAdminWorkspace && isShapeLayer(layer) && !isStandaloneImageLayer(layer)))
          ? { ...layer, ...patch }
          : layer
      )
    }));
  }

  function updateSelectedCornerRadiusForAll(nextValue: number) {
    if (!selectedLayerCanUseShapeControls || !selectedLayerIsShape || selectedLayer?.shapeVariant === "circle") return;
    const radius = clampCornerRadius(nextValue);
    updateSelectedLayer({
      cornerRadius: radius,
      cornerRadii: cornerRadiiFromUniform(radius)
    });
  }

  function updateSelectedCornerRadiusCorner(key: CornerRadiusKey, nextValue: number) {
    if (
      !selectedLayerCanUseShapeControls ||
      !selectedLayer ||
      !selectedLayerIsShape ||
      selectedLayer.shapeVariant === "circle"
    ) {
      return;
    }
    const nextRadii = {
      ...getLayerCornerRadii(selectedLayer),
      [key]: clampCornerRadius(nextValue)
    };
    updateSelectedLayer({
      cornerRadius: areCornerRadiiUniform(nextRadii) ? nextRadii.topLeft : selectedLayer.cornerRadius || 0,
      cornerRadii: nextRadii
    });
  }

  async function resetSelectedImageToOriginalSize() {
    if (!selectedLayerCanEdit || !selectedLayer || !isStandaloneImageLayer(selectedLayer) || !selectedLayer.imageDataUrl) {
      return;
    }

    const layerId = selectedLayer.id;
    let originalWidth = normalizeOptionalPositiveNumber(selectedLayer.imageOriginalWidth);
    let originalHeight = normalizeOptionalPositiveNumber(selectedLayer.imageOriginalHeight);

    if (!originalWidth || !originalHeight) {
      try {
        const image = await loadHtmlImage(selectedLayer.imageDataUrl);
        originalWidth = normalizeOptionalPositiveNumber(image.naturalWidth || image.width);
        originalHeight = normalizeOptionalPositiveNumber(image.naturalHeight || image.height);
      } catch {
        return;
      }
    }

    if (!originalWidth || !originalHeight) return;
    const resetWidth = Math.round(originalWidth);
    const resetHeight = Math.round(originalHeight);

    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              width: resetWidth,
              height: resetHeight,
              imageOriginalWidth: resetWidth,
              imageOriginalHeight: resetHeight
            }
          : layer
      )
    }));
  }

  function beginToolbarNumberScrub(
    event: ReactPointerEvent<HTMLElement>,
    options: {
      value: number;
      min?: number;
      max?: number;
      step?: number;
      pixelsPerStep?: number;
      enabled?: boolean;
      onChange: (nextValue: number) => void;
    }
  ) {
    if (!(options.enabled ?? selectedLayersCanEdit) || event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const {
      value,
      min = Number.NEGATIVE_INFINITY,
      max = Number.POSITIVE_INFINITY,
      step = 1,
      pixelsPerStep = 4,
      onChange
    } = options;
    const startX = event.clientX;
    const startValue = Number.isFinite(value) ? value : 0;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    let latestValue = startValue;

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const stepPrecision = Math.max(0, (step.toString().split(".")[1] || "").length);
    const clampValue = (nextValue: number) => Math.min(max, Math.max(min, nextValue));
    const normalizeValue = (nextValue: number) =>
      Number(clampValue(nextValue).toFixed(stepPrecision));

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const stepDelta = Math.round((pointerEvent.clientX - startX) / pixelsPerStep);
      const nextValue = normalizeValue(startValue + stepDelta * step);
      if (nextValue === latestValue) return;
      latestValue = nextValue;
      onChange(nextValue);
    };

    const finishScrub = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishScrub);
      window.removeEventListener("pointercancel", finishScrub);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishScrub);
    window.addEventListener("pointercancel", finishScrub);
  }

  function beginInlineFreeTextEdit(
    layer: TextLayer,
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    if (!canEditLayer(layer) || typeof layer.content !== "string") return;
    event.cancelBubble = true;
    setHoveredClientPrompt(null);
    setActiveCanvasTool("move");
    setSelectedLayerIds([layer.id]);
    setInlineTextEditor({
      layerId: layer.id,
      value: layer.content
    });
  }

  function commitInlineTextEdit(value = inlineTextEditor?.value) {
    if (!inlineTextEditor || typeof value !== "string") return;
    const editingLayer = template.layers.find((layer) => layer.id === inlineTextEditor.layerId);
    if (!canEditLayer(editingLayer)) {
      setInlineTextEditor(null);
      return;
    }
    const nextValue = value.trim() ? value : "Text";
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((layer) =>
        layer.id === inlineTextEditor.layerId
          ? {
              ...layer,
              content: nextValue,
              name: nextValue.trim() || "Free text",
              ...(isAdminWorkspace && layer.clientPrompt ? { clientPrompt: nextValue } : {})
            }
          : layer
      )
    }));
    setInlineTextEditor(null);
  }

  function cancelInlineTextEdit() {
    setInlineTextEditor(null);
  }

  function getLayerBounds(layer: TextLayer): LayerBounds {
    const node = layerRefs.current[layer.id];
    if (node) {
      const parentLayer = node.getLayer();
      const rect = parentLayer
        ? node.getClientRect({ relativeTo: parentLayer })
        : node.getClientRect();
      return {
        id: layer.id,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    }

    return {
      id: layer.id,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: isShapeLayer(layer)
        ? layer.height || layer.width
        : Math.max(layer.fontSize, layer.fontSize * layer.lineHeight)
    };
  }

  function getSelectedLayerBounds() {
    return selectedLayers.map(getLayerBounds);
  }

  function getBoundsUnion(bounds: LayerBounds[]) {
    const left = Math.min(...bounds.map((item) => item.x));
    const top = Math.min(...bounds.map((item) => item.y));
    const right = Math.max(...bounds.map((item) => item.x + item.width));
    const bottom = Math.max(...bounds.map((item) => item.y + item.height));
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
  }

  function getMovingLayerIds(activeLayerId: string) {
    const groupDrag = groupDragRef.current;
    if (groupDrag?.activeLayerId === activeLayerId) {
      return selectedLayerIds.filter((id) => layerRefs.current[id] && canEditLayerById(id));
    }
    return canEditLayerById(activeLayerId) ? [activeLayerId] : [];
  }

  function getAlignmentSnap(movingIds: string[]) {
    const movingIdSet = new Set(movingIds);
    const movingBounds = template.layers
      .filter((layer) => movingIdSet.has(layer.id))
      .map(getLayerBounds);
    const targetBounds = template.layers
      .filter((layer) => !movingIdSet.has(layer.id))
      .map(getLayerBounds);

    if (!movingBounds.length) {
      return { deltaX: 0, deltaY: 0, guides: [] as AlignmentGuide[] };
    }

    const moving = getBoundsUnion(movingBounds);
    const threshold = GUIDE_SNAP_THRESHOLD / stageScale;
    const movingXPoints = [
      moving.x,
      moving.x + moving.width / 2,
      moving.x + moving.width
    ];
    const movingYPoints = [
      moving.y,
      moving.y + moving.height / 2,
      moving.y + moving.height
    ];
    type AlignmentMatch = {
      distance: number;
      offset: number;
      value: number;
      target?: LayerBounds;
      isCanvasCenter?: boolean;
    };
    let bestX: AlignmentMatch | null = null;
    let bestY: AlignmentMatch | null = null;

    targetBounds.forEach((target) => {
      const targetXPoints = [
        target.x,
        target.x + target.width / 2,
        target.x + target.width
      ];
      const targetYPoints = [
        target.y,
        target.y + target.height / 2,
        target.y + target.height
      ];

      targetXPoints.forEach((targetX) => {
        movingXPoints.forEach((movingX) => {
          const offset = targetX - movingX;
          const distance = Math.abs(offset);
          if (distance <= threshold && (!bestX || distance < bestX.distance)) {
            bestX = { distance, offset, value: targetX, target };
          }
        });
      });

      targetYPoints.forEach((targetY) => {
        movingYPoints.forEach((movingY) => {
          const offset = targetY - movingY;
          const distance = Math.abs(offset);
          if (distance <= threshold && (!bestY || distance < bestY.distance)) {
            bestY = { distance, offset, value: targetY, target };
          }
        });
      });
    });

    const canvasCenterX = template.width / 2;
    const canvasCenterY = template.height / 2;
    const movingCenterX = moving.x + moving.width / 2;
    const movingCenterY = moving.y + moving.height / 2;
    const canvasCenterXOffset = canvasCenterX - movingCenterX;
    const canvasCenterYOffset = canvasCenterY - movingCenterY;
    const canvasCenterXDistance = Math.abs(canvasCenterXOffset);
    const canvasCenterYDistance = Math.abs(canvasCenterYOffset);
    const currentBestX = bestX as AlignmentMatch | null;
    const currentBestY = bestY as AlignmentMatch | null;

    if (canvasCenterXDistance <= threshold && (!currentBestX || canvasCenterXDistance < currentBestX.distance)) {
      bestX = {
        distance: canvasCenterXDistance,
        offset: canvasCenterXOffset,
        value: canvasCenterX,
        isCanvasCenter: true
      };
    }

    if (canvasCenterYDistance <= threshold && (!currentBestY || canvasCenterYDistance < currentBestY.distance)) {
      bestY = {
        distance: canvasCenterYDistance,
        offset: canvasCenterYOffset,
        value: canvasCenterY,
        isCanvasCenter: true
      };
    }

    const matchedX = bestX as AlignmentMatch | null;
    const matchedY = bestY as AlignmentMatch | null;
    const deltaX = matchedX?.offset || 0;
    const deltaY = matchedY?.offset || 0;
    const snappedMoving = {
      ...moving,
      x: moving.x + deltaX,
      y: moving.y + deltaY
    };
    const extension = GUIDE_EXTENSION / stageScale;
    const guides: AlignmentGuide[] = [];

    if (matchedX) {
      const y1 = matchedX.target
        ? Math.max(0, Math.min(matchedX.target.y, snappedMoving.y) - extension)
        : 0;
      const y2 = matchedX.target
        ? Math.min(
            template.height,
            Math.max(matchedX.target.y + matchedX.target.height, snappedMoving.y + snappedMoving.height) +
              extension
          )
        : template.height;
      guides.push({
        id: matchedX.isCanvasCenter ? "vertical-canvas-center" : `vertical-${matchedX.target?.id}`,
        orientation: "vertical",
        points: [matchedX.value, y1, matchedX.value, y2]
      });
    }

    if (matchedY) {
      const x1 = matchedY.target
        ? Math.max(0, Math.min(matchedY.target.x, snappedMoving.x) - extension)
        : 0;
      const x2 = matchedY.target
        ? Math.min(
            template.width,
            Math.max(matchedY.target.x + matchedY.target.width, snappedMoving.x + snappedMoving.width) +
              extension
          )
        : template.width;
      guides.push({
        id: matchedY.isCanvasCenter ? "horizontal-canvas-center" : `horizontal-${matchedY.target?.id}`,
        orientation: "horizontal",
        points: [x1, matchedY.value, x2, matchedY.value]
      });
    }

    return { deltaX, deltaY, guides };
  }

  function updateAlignmentGuidesForDrag(activeLayerId: string) {
    const movingIds = getMovingLayerIds(activeLayerId);
    const { deltaX, deltaY, guides } = getAlignmentSnap(movingIds);

    if (deltaX || deltaY) {
      movingIds.forEach((id) => {
        const node = layerRefs.current[id];
        if (node) {
          node.position({
            x: node.x() + deltaX,
            y: node.y() + deltaY
          });
        }
      });
    }

    setAlignmentGuides(guides);
    transformerRef.current?.forceUpdate();
  }

  function applyLayerPositions(positions: Record<string, { x: number; y: number }>) {
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((layer) =>
        positions[layer.id] && canEditLayerForMode(layer, isAdminWorkspace)
          ? { ...layer, ...positions[layer.id] }
          : layer
      )
    }));
  }

  function alignSelectedLayers(
    axis: "horizontal" | "vertical",
    placement: "start" | "center" | "end"
  ) {
    if (!canEditWorkspace || editableSelectedLayers.length < 2 || !selectedLayersCanEdit) return;
    const bounds = getSelectedLayerBounds();
    const group = getBoundsUnion(bounds);
    const byId = new Map(bounds.map((item) => [item.id, item]));
    const positions = selectedLayers.reduce<Record<string, { x: number; y: number }>>(
      (nextPositions, layer) => {
        const item = byId.get(layer.id);
        if (!item) return nextPositions;
        let targetX = item.x;
        let targetY = item.y;

        if (axis === "horizontal") {
          if (placement === "start") targetX = group.x;
          if (placement === "center") targetX = group.x + (group.width - item.width) / 2;
          if (placement === "end") targetX = group.x + group.width - item.width;
        } else {
          if (placement === "start") targetY = group.y;
          if (placement === "center") targetY = group.y + (group.height - item.height) / 2;
          if (placement === "end") targetY = group.y + group.height - item.height;
        }

        nextPositions[layer.id] = {
          x: Math.round(layer.x + targetX - item.x),
          y: Math.round(layer.y + targetY - item.y)
        };
        return nextPositions;
      },
      {}
    );
    applyLayerPositions(positions);
  }

  function distributeSelectedLayers(axis: "horizontal" | "vertical") {
    if (!canEditWorkspace || editableSelectedLayers.length < 3 || !selectedLayersCanEdit) return;
    const bounds = getSelectedLayerBounds();
    const group = getBoundsUnion(bounds);
    const sorted = [...bounds].sort((a, b) =>
      axis === "horizontal" ? a.x - b.x : a.y - b.y
    );
    const totalSize = sorted.reduce(
      (sum, item) => sum + (axis === "horizontal" ? item.width : item.height),
      0
    );
    const groupSize = axis === "horizontal" ? group.width : group.height;
    const gap = (groupSize - totalSize) / (sorted.length - 1);
    let cursor = axis === "horizontal" ? group.x : group.y;
    const byId = new Map(selectedLayers.map((layer) => [layer.id, layer]));
    const positions: Record<string, { x: number; y: number }> = {};

    sorted.forEach((item) => {
      const layer = byId.get(item.id);
      if (!layer) return;
      positions[item.id] = {
        x: Math.round(axis === "horizontal" ? layer.x + cursor - item.x : layer.x),
        y: Math.round(axis === "vertical" ? layer.y + cursor - item.y : layer.y)
      };
      cursor += (axis === "horizontal" ? item.width : item.height) + gap;
    });

    applyLayerPositions(positions);
  }

  function tidySelectedLayers() {
    if (!canEditWorkspace || editableSelectedLayers.length < 2 || !selectedLayersCanEdit) return;
    const bounds = getSelectedLayerBounds();
    const group = getBoundsUnion(bounds);
    const mainAxis: "horizontal" | "vertical" =
      group.width > group.height ? "horizontal" : "vertical";
    const sorted = [...bounds].sort((a, b) =>
      mainAxis === "horizontal" ? a.x - b.x : a.y - b.y
    );
    const totalSize = sorted.reduce(
      (sum, item) => sum + (mainAxis === "horizontal" ? item.width : item.height),
      0
    );
    const groupSize = mainAxis === "horizontal" ? group.width : group.height;
    const gap = selectedLayers.length >= 3 ? (groupSize - totalSize) / (sorted.length - 1) : 0;
    let cursor = mainAxis === "horizontal" ? group.x : group.y;
    const byId = new Map(selectedLayers.map((layer) => [layer.id, layer]));
    const positions: Record<string, { x: number; y: number }> = {};

    sorted.forEach((item) => {
      const layer = byId.get(item.id);
      if (!layer) return;
      const targetX =
        mainAxis === "horizontal"
          ? selectedLayers.length >= 3
            ? cursor
            : item.x
          : group.x;
      const targetY =
        mainAxis === "vertical"
          ? selectedLayers.length >= 3
            ? cursor
            : item.y
          : group.y;
      positions[item.id] = {
        x: Math.round(layer.x + targetX - item.x),
        y: Math.round(layer.y + targetY - item.y)
      };
      cursor += (mainAxis === "horizontal" ? item.width : item.height) + gap;
    });

    applyLayerPositions(positions);
  }

  function addTextLayer(column: string, x = 120, y = 120) {
    if (!column || !canAddDataTextLayer) return;
    const layer: TextLayer = {
      id: uid("layer"),
      name: column,
      column,
      x,
      y,
      width: Math.max(80, Math.min(420, template.width - x - 32)),
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
      fontWeight: "600",
      color: "#000000",
      align: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      textTransform: "none",
      createdByClient: !isAdminWorkspace
    };
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: [...current.layers, layer]
    }));
    setSelectedLayerIds([layer.id]);
  }

  function addFreeTextLayer(x = 120, y = 120, content = "Text", fontSize = DEFAULT_ADDED_TEXT_FONT_SIZE) {
    if (!canAddFreeTextLayer) return;
    const layer: TextLayer = {
      id: uid("layer"),
      name: content.trim() || "Free text",
      kind: "text",
      column: "",
      content,
      x,
      y,
      width: Math.max(80, Math.min(420, template.width - x - 32)),
      fontFamily: availableFonts[0],
      fontSize,
      fontWeight: "600",
      color: "#000000",
      align: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      textTransform: "none",
      createdByClient: !isAdminWorkspace
    };
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: [...current.layers, layer]
    }));
    setSelectedLayerIds([layer.id]);
    setActiveCanvasTool("move");
  }

  function addClientInfoField() {
    if (!isAdminWorkspace) return;
    const prompt = "Nhập thông tin tại đây";
    const layer: TextLayer = {
      id: uid("field"),
      name: prompt,
      kind: "text",
      column: "",
      content: prompt,
      clientPrompt: prompt,
      x: Math.max(32, Math.round(template.width * 0.2)),
      y: Math.max(32, Math.round(template.height * 0.2)),
      width: Math.max(160, Math.min(420, template.width - 64)),
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
      fontWeight: "600",
      color: "#071025",
      align: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      textTransform: "none"
    };
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: [...current.layers, layer]
    }));
    setSelectedLayerIds([layer.id]);
    setActiveCanvasTool("move");
    setInlineTextEditor({ layerId: layer.id, value: prompt });
  }
  function addShapeLayer(shapeVariant: ShapeVariant) {
    if (!canEditWorkspace) return;
    const size = shapeVariant === "frame" ? 280 : 220;
    const x = Math.max(32, Math.round((template.width - size) / 2));
    const y = Math.max(32, Math.round((template.height - size) / 2));
    const layer: TextLayer = {
      id: uid("shape"),
      name:
        shapeVariant === "frame"
          ? "Frame"
          : shapeVariant === "circle"
            ? "Circle"
            : "Shape",
      kind: "shape",
      shapeVariant,
      column: "",
      x,
      y,
      width: size,
      height: size,
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
      fontWeight: "600",
      color: "#071025",
      fill: shapeVariant === "frame" ? "#eef7ff" : "#8b3dff",
      stroke: shapeVariant === "frame" ? "#8b3dff" : "#6d28d9",
      strokeWidth: 0,
      cornerRadius: shapeVariant === "circle" ? size / 2 : 0,
      opacity: 1,
      align: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      textTransform: "none",
      createdByClient: !isAdminWorkspace
    };
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: [...current.layers, layer]
    }));
    setSelectedLayerIds([layer.id]);
    setActiveCanvasTool("move");
  }

  function placeImageInFrame(
    image: TemplateImage,
    targetLayerId?: string,
    dropPoint?: { x: number; y: number },
    useSelectedFrame = true
  ) {
    const dataUrl = getTemplateLibraryImage(image);
    if (!dataUrl || !canEditWorkspace) return;
    const targetFrameCandidate =
      (targetLayerId
        ? template.layers.find((layer) => layer.id === targetLayerId && isShapeLayer(layer))
        : null) || (useSelectedFrame ? selectedLayers.find((layer) => canUseFrameSlot(layer)) : null);
    const targetFrame = canUseFrameSlot(targetFrameCandidate) ? targetFrameCandidate : null;
    if (targetFrame) {
      const targetIsStandaloneImage = isStandaloneImageLayer(targetFrame);
      const standaloneSize = targetIsStandaloneImage
        ? getContainedImageSize(
            image,
            Math.max(24, targetFrame.width),
            Math.max(24, targetFrame.height || targetFrame.width)
          )
        : null;
      updateTemplate((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        layers: current.layers.map((layer) =>
          layer.id === targetFrame.id
            ? {
                ...layer,
                kind: "shape",
                shapeVariant: targetIsStandaloneImage ? "image" : layer.shapeVariant || "frame",
                imageDataUrl: dataUrl,
                imageName: image.name,
                imageOriginalWidth: image.width,
                imageOriginalHeight: image.height,
                imageCropFocusX: 0.5,
                imageCropFocusY: 0.5,
                imageCropZoom: 1,
                imageUsage: targetIsStandaloneImage ? "standalone" : "frame-fill",
                ...(standaloneSize ? standaloneSize : {}),
                fill: targetIsStandaloneImage ? "#ffffff" : layer.fill || "#eef7ff",
                stroke: layer.stroke || "#8b3dff",
                strokeWidth: layer.strokeWidth ?? 0,
                cornerRadius: layer.cornerRadius ?? 0
              }
            : layer
        )
      }));
      setSelectedLayerIds([targetFrame.id]);
      setActiveCanvasTool("move");
      return;
    }

    const size = getContainedImageSize(
      image,
      Math.min(420, Math.max(180, Math.round(template.width * 0.32))),
      Math.min(420, Math.max(180, Math.round(template.height * 0.32)))
    );
    const width = size.width;
    const height = size.height;
    const x = Math.max(
      0,
      Math.round(dropPoint ? dropPoint.x - width / 2 : (template.width - width) / 2)
    );
    const y = Math.max(
      0,
      Math.round(dropPoint ? dropPoint.y - height / 2 : (template.height - height) / 2)
    );
    const layer: TextLayer = {
      id: uid("image"),
      name: image.name || "Image frame",
      kind: "shape",
      shapeVariant: "image",
      column: "",
      x,
      y,
      width,
      height,
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
      fontWeight: "600",
      color: "#071025",
      fill: "#ffffff",
      stroke: "#8b3dff",
      strokeWidth: 0,
      cornerRadius: 0,
      opacity: 1,
      imageDataUrl: dataUrl,
      imageName: image.name,
      imageOriginalWidth: image.width,
      imageOriginalHeight: image.height,
      imageUsage: "standalone",
      align: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      textTransform: "none",
      createdByClient: !isAdminWorkspace
    };
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: [...current.layers, layer]
    }));
    setSelectedLayerIds([layer.id]);
    setActiveCanvasTool("move");
  }

  function setTemplateImageDragPreview(event: React.DragEvent<HTMLElement>, image: TemplateImage) {
    if (typeof document === "undefined") return;
    const dataUrl = getTemplateLibraryImage(image);
    if (!dataUrl) return;
    const previewSize = getContainedImageSize(image, 180, 120);
    const preview = document.createElement("div");
    preview.style.position = "fixed";
    preview.style.left = "-1000px";
    preview.style.top = "-1000px";
    preview.style.width = `${previewSize.width}px`;
    preview.style.height = `${previewSize.height}px`;
    preview.style.pointerEvents = "none";
    preview.style.background = "transparent";

    const previewImage = document.createElement("img");
    previewImage.src = getPreviewImageSrc(dataUrl, 240);
    previewImage.alt = "";
    previewImage.draggable = false;
    previewImage.style.width = "100%";
    previewImage.style.height = "100%";
    previewImage.style.objectFit = "contain";
    previewImage.style.display = "block";
    preview.appendChild(previewImage);
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, previewSize.width / 2, previewSize.height / 2);
    window.setTimeout(() => preview.remove(), 0);
  }

  function removeSelectedLayer() {
    if (!selectedLayerIds.length || !canEditWorkspace) return;
    const editableIdSet = new Set(editableSelectedLayers.map((layer) => layer.id));
    if (!editableIdSet.size) return;
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.filter((layer) => !editableIdSet.has(layer.id))
    }));
    setSelectedLayerIds((current) => current.filter((id) => !editableIdSet.has(id)));
  }

  function duplicateSelectedLayers() {
    if (!isAdminWorkspace || !editableSelectedLayers.length) return;
    const duplicates = editableSelectedLayers.map((layer, index) => ({
      ...layer,
      id: uid(isShapeLayer(layer) ? "shape" : "layer"),
      name: `${layer.name} - Bản sao`,
      x: Math.min(Math.max(0, template.width - layer.width), layer.x + 24 + index * 8),
      y: Math.min(
        Math.max(0, template.height - (layer.height || layer.fontSize * layer.lineHeight)),
        layer.y + 24 + index * 8
      )
    }));
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: [...current.layers, ...duplicates]
    }));
    setSelectedLayerIds(duplicates.map((layer) => layer.id));
    setActiveCanvasTool("move");
  }
  async function saveAdminStateToCloud(
    nextState: AppState,
    options: {
      savingMessage?: string;
      savedMessage?: string;
      toastMessage?: string;
    } = {}
  ) {
    if (!remoteSyncEnabledRef.current || !remoteStateReadyRef.current) {
      setCloudSync({
        status: "error",
        message: "Cloud chưa sẵn sàng, hãy tải lại trang trước khi lưu"
      });
      showDownloadToast("Cloud chưa sẵn sàng, hãy tải lại trang trước khi lưu");
      return false;
    }

    setCloudSync({
      status: "saving",
      message: options.savingMessage || "Đang lưu cloud..."
    });
    try {
      let response = await fetch("/api/state", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: persistedLibraryState(nextState),
          baseUpdatedAt: remoteStateUpdatedAtRef.current
        })
      });
      let data = await readJsonResponse(response);
      if (!response.ok) {
        if (response.status === 401) {
          expireAdminSession();
          return false;
        }
        if (response.status === 409) {
          remoteStateUpdatedAtRef.current =
            (data as { updatedAt?: string | null } | null)?.updatedAt || remoteStateUpdatedAtRef.current;
          await loadCloudStateForAdmin();
          response = await fetch("/api/state", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              state: persistedLibraryState(nextState),
              baseUpdatedAt: remoteStateUpdatedAtRef.current
            })
          });
          data = await readJsonResponse(response);
          if (response.ok) {
            remoteStateUpdatedAtRef.current =
              (data as { savedAt?: string | null } | null)?.savedAt || remoteStateUpdatedAtRef.current;
            setCloudSync({
              status: "saved",
              message: options.savedMessage || "Đã lưu cloud"
            });
            if (options.toastMessage) showDownloadToast(options.toastMessage);
            return true;
          }
          if (response.status === 401) {
            expireAdminSession();
            return false;
          }
          if (response.status !== 409) {
            throw new Error(errorMessageFromApi(data, "Không lưu được cloud"));
          }
          remoteStateUpdatedAtRef.current =
            (data as { updatedAt?: string | null } | null)?.updatedAt || remoteStateUpdatedAtRef.current;
          const message = "Dữ liệu cloud đã thay đổi, hãy tải lại trang trước khi lưu";
          setCloudSync({ status: "error", message });
          showDownloadToast(message);
          return false;
        }
        throw new Error(errorMessageFromApi(data, "Không lưu được cloud"));
      }
      remoteStateUpdatedAtRef.current =
        (data as { savedAt?: string | null } | null)?.savedAt || remoteStateUpdatedAtRef.current;
      setCloudSync({
        status: "saved",
        message: options.savedMessage || "Đã lưu cloud"
      });
      if (options.toastMessage) showDownloadToast(options.toastMessage);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi lưu cloud";
      setCloudSync({ status: "error", message });
      showDownloadToast(message);
      return false;
    }
  }

  async function loadCloudStateForAdmin() {
    try {
      const response = await fetchCloudState();
      const data = await readJsonResponse(response);
      const isStateResponse =
        data !== null &&
        typeof data === "object" &&
        ("state" in data || "updatedAt" in data);
      if (!response.ok || !isStateResponse) {
        throw new Error(errorMessageFromApi(data, "Cannot load cloud state"));
      }

      remoteSyncEnabledRef.current = true;
      remoteStateReadyRef.current = true;
      remoteStateUpdatedAtRef.current =
        (data as { updatedAt?: string | null } | null)?.updatedAt || null;
      const remoteState = (data as { state?: AppState | null } | null)?.state;
      if (remoteState) {
        hasLoadedRemoteStateRef.current = true;
        const normalized = normalizeAppState(remoteState);
        setAppStateBase((current) => {
          skipNextRemoteSaveRef.current = true;
          const nextState = mergePersistedLibraries(current, normalized);
          appStateRef.current = nextState;
          return nextState;
        });
      }
      setCloudSync({
        status: "saved",
        message: remoteState ? "Đã tải dữ liệu cloud" : "Cloud đã sẵn sàng"
      });
    } catch (error) {
      remoteSyncEnabledRef.current = false;
      remoteStateReadyRef.current = true;
      setCloudSync({
        status: "error",
        message: error instanceof Error ? error.message : "Cannot load cloud state"
      });
    }
  }

  async function handleAdminUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: adminLoginName.trim(),
          password: adminCode.trim()
        })
      });
      const data = await readJsonResponse(response);
      if (response.ok) {
        const identity = data as {
          account?: string | null;
          name?: string | null;
          role?: string | null;
          id?: string | null;
        } | null;
        const account = identity?.account || adminLoginName.trim();
        touchAdminSession();
        lastSessionTouchRef.current = Date.now();
        localStorage.setItem(ADMIN_ACCOUNT_KEY, account);
        setIsAdmin(true);
        applyAdminIdentity({ ...identity, account });
        setAdminLoginName(account);
        setAdminSettingsName(account);
        setAdminCode("");
        skipNextRemoteSaveRef.current = false;
        await loadCloudStateForAdmin();
        if (remoteSyncEnabledRef.current) {
          setCloudSync({ status: "ready", message: "Cloud đã sẵn sàng" });
        }
        return;
      }
      if (response.status !== 404 && response.status !== 500) {
        setAdminError(errorMessageFromApi(data, "Tai khoan hoac mat khau khong dung"));
        return;
      }
      if (!isLocalAdminFallbackAllowed()) {
        setAdminError("Khong the dang nhap admin luc nay");
        return;
      }
    } catch {
      if (!isLocalAdminFallbackAllowed()) {
        setAdminError("Khong the dang nhap admin luc nay");
        return;
      }
      // Fall back to local admin only when the API is not running in local development.
    }
    if (adminLoginName.trim() !== getStoredAdminAccount()) {
      setAdminError("Tài khoản quản trị không đúng");
      return;
    }
    const hash = await sha256(adminCode.trim());
    const storedHash = getStoredAdminPasswordHash();
    const matchesLocalPassword = storedHash
      ? hash === storedHash
      : adminCode.trim() === DEFAULT_ADMIN_PASSWORD;
    if (!matchesLocalPassword) {
      setAdminError("Mật khẩu quản trị không đúng");
      return;
    }
    touchAdminSession();
    lastSessionTouchRef.current = Date.now();
    skipNextRemoteSaveRef.current = false;
    setIsAdmin(true);
    // The offline fallback has no account table, so treat the local login as the
    // super admin to keep the workspace usable without the API.
    applyAdminIdentity({ account: getStoredAdminAccount(), role: "super_admin" });
    setAdminLoginName(getStoredAdminAccount());
    setAdminCode("");
  }

  function applyAdminIdentity(identity: {
    account?: string | null;
    name?: string | null;
    role?: string | null;
    id?: string | null;
  }) {
    const role: AdminRole = identity.role === "super_admin" ? "super_admin" : "admin";
    setAdminRole(role);
    setAdminUserId(identity.id || "");
    if (identity.account) setAdminAccount(identity.account);
    setAdminName(
      role === "super_admin" ? SUPER_ADMIN_NAME : identity.name || identity.account || ""
    );
  }

  function expireAdminSession(message = "PhiÃªn admin Ä‘Ã£ háº¿t háº¡n, hÃ£y Ä‘Äƒng nháº­p láº¡i") {
    clearAdminSession();
    setIsAdmin(false);
    setSelectedLayerIds([]);
    setShowAdminSettingsModal(false);
    setShowAccountManagerPage(false);
    setAdminError(message);
    remoteSyncEnabledRef.current = false;
    remoteStateReadyRef.current = false;
    setCloudSync({
      status: "error",
      message
    });
  }

  function logoutAdmin() {
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    }).catch(() => undefined);
    clearAdminSession();
    setIsAdmin(false);
    setSelectedLayerIds([]);
    setAdminCode("");
    setAdminError("");
    setAdminLoginName(getStoredAdminAccount());
    setShowAdminSettingsModal(false);
    setShowAccountManagerPage(false);
    closeManagementPages();
  }

  function openAdminSettings() {
    if (!isAdmin) return;
    const account = getStoredAdminAccount();
    setAdminSettingsName(account);
    setAdminNewPassword("");
    setAdminConfirmPassword("");
    setAdminSettingsError("");
    setAdminSettingsMessage("");
    setShowAdminSettingsModal(true);
  }

  async function saveAdminSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminSettingsError("");
    setAdminSettingsMessage("");
    if (!adminNewPassword || !adminConfirmPassword) {
      setAdminSettingsError("Vui lòng nhập mật khẩu mới và xác nhận mật khẩu");
      return;
    }
    if (adminNewPassword.length < 4) {
      setAdminSettingsError("Mật khẩu mới cần ít nhất 4 ký tự");
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminSettingsError("Xác nhận mật khẩu chưa khớp");
      return;
    }
    if (remoteSyncEnabledRef.current) {
      try {
        const response = await fetch("/api/auth/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: adminNewPassword.trim()
          })
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(errorMessageFromApi(data, "Khong luu duoc tai khoan admin"));
        }
        localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await sha256(adminNewPassword.trim()));
        setAdminNewPassword("");
        setAdminConfirmPassword("");
        setAdminSettingsMessage("Đã đổi mật khẩu quản trị");
        return;
      } catch (error) {
        setAdminSettingsError(
          error instanceof Error ? error.message : "Khong luu duoc tai khoan admin"
        );
        return;
      }
    }
    localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await sha256(adminNewPassword.trim()));
    setAdminNewPassword("");
    setAdminConfirmPassword("");
    setAdminSettingsMessage("Đã đổi mật khẩu quản trị");
  }

  function resetAccountManagerForms() {
    setShowCreateMemberForm(false);
    setNewMemberAccount("");
    setNewMemberName("");
    setNewMemberPassword("");
    setMemberPendingDeleteId(null);
    setMemberResetPasswordId(null);
    setMemberResetPassword("");
    setEditingOwnNameDraft(null);
  }

  function applyAccountManagerResponse(data: unknown) {
    const payload = data as { users?: AdminUser[]; me?: AdminUser } | null;
    if (Array.isArray(payload?.users)) setAccountUsers(payload.users);
    if (payload?.me) applyAdminIdentity(payload.me);
  }

  async function loadAccountUsers() {
    setAccountUsersLoading(true);
    setAccountManagerError("");
    try {
      const response = await fetch("/api/auth/users", { credentials: "include" });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        if (response.status === 401) {
          expireAdminSession();
          return;
        }
        throw new Error(errorMessageFromApi(data, "Không tải được danh sách tài khoản"));
      }
      if (!Array.isArray((data as { users?: AdminUser[] } | null)?.users)) {
        // Local development serves the SPA for unknown /api routes, so an OK
        // response without a user list still means account management is offline.
        throw new Error("Quản lý tài khoản cần kết nối cơ sở dữ liệu");
      }
      applyAccountManagerResponse(data);
    } catch (error) {
      setAccountUsers([]);
      setAccountManagerError(
        error instanceof Error ? error.message : "Không tải được danh sách tài khoản"
      );
    } finally {
      setAccountUsersLoading(false);
    }
  }

  function openAccountManager() {
    if (!isAdmin) return;
    resetAccountManagerForms();
    setAccountManagerMessage("");
    setShowProjectAccountMenu(false);
    setShowSettingsMenu(false);
    setShowAccountManagerPage(true);
    void loadAccountUsers();
  }

  function closeAccountManager() {
    setShowAccountManagerPage(false);
    resetAccountManagerForms();
    setAccountManagerError("");
    setAccountManagerMessage("");
  }

  async function requestAccountChange(
    init: RequestInit,
    successMessage: string,
    fallbackError: string
  ) {
    setAccountManagerBusy(true);
    setAccountManagerError("");
    setAccountManagerMessage("");
    try {
      const response = await fetch("/api/auth/users", {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...init
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        if (response.status === 401) {
          expireAdminSession();
          return false;
        }
        throw new Error(errorMessageFromApi(data, fallbackError));
      }
      applyAccountManagerResponse(data);
      setAccountManagerMessage(successMessage);
      return true;
    } catch (error) {
      setAccountManagerError(error instanceof Error ? error.message : fallbackError);
      return false;
    } finally {
      setAccountManagerBusy(false);
    }
  }

  async function createMemberAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = newMemberAccount.trim();
    const name = newMemberName.trim();
    const password = newMemberPassword.trim();
    if (!account) {
      setAccountManagerError("Vui lòng nhập tài khoản đăng nhập");
      return;
    }
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setAccountManagerError(`Mật khẩu cần ít nhất ${MIN_ADMIN_PASSWORD_LENGTH} ký tự`);
      return;
    }
    const created = await requestAccountChange(
      {
        method: "POST",
        body: JSON.stringify({ account, name: name || account, password })
      },
      `Đã tạo tài khoản ${account}`,
      "Không tạo được tài khoản"
    );
    if (!created) return;
    setNewMemberAccount("");
    setNewMemberName("");
    setNewMemberPassword("");
    setShowCreateMemberForm(false);
    await loadAccountUsers();
  }

  async function deleteMemberAccount(user: AdminUser) {
    setMemberPendingDeleteId(null);
    await requestAccountChange(
      { method: "DELETE", body: JSON.stringify({ id: user.id }) },
      `Đã xóa tài khoản ${user.account}`,
      "Không xóa được tài khoản"
    );
  }

  async function saveMemberPassword(user: AdminUser) {
    const password = memberResetPassword.trim();
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      setAccountManagerError(`Mật khẩu cần ít nhất ${MIN_ADMIN_PASSWORD_LENGTH} ký tự`);
      return;
    }
    const saved = await requestAccountChange(
      { method: "PATCH", body: JSON.stringify({ id: user.id, password }) },
      `Đã đổi mật khẩu cho ${user.account}`,
      "Không đổi được mật khẩu"
    );
    if (!saved) return;
    if (user.id === adminUserId) {
      localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await sha256(password));
    }
    setMemberResetPasswordId(null);
    setMemberResetPassword("");
  }

  async function saveOwnDisplayName() {
    const name = (editingOwnNameDraft || "").trim();
    if (!name) {
      setAccountManagerError("Tên không được để trống");
      return;
    }
    if (!adminUserId) {
      setAccountManagerError("Không xác định được tài khoản đang đăng nhập");
      return;
    }
    const saved = await requestAccountChange(
      { method: "PATCH", body: JSON.stringify({ id: adminUserId, name }) },
      "Đã cập nhật tên hiển thị",
      "Không đổi được tên hiển thị"
    );
    if (!saved) return;
    setEditingOwnNameDraft(null);
  }

  function openTemplateLibraryModal() {
    const adminProjectRoute = isAdmin && isAdminPath;
    setProjectRouteAdmin(adminProjectRoute);
    setBrowserPath(getProjectHomePath(adminProjectRoute));
    setShowDatasetLibraryModal(false);
    setShowFontLibraryModal(false);
    setShowTemplateLibraryModal(true);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
    setSelectedTemplateFolderId(activeTemplateFolderId);
    setProjectFolderId(null);
    setProjectListingMode("home");
    setProjectDesignPage(1);
  }

  function openCurrentTemplateFolder() {
    const folderId = appState.templateFolders.some((folder) => folder.id === template.folderId)
      ? template.folderId
      : fallbackTemplateFolderId;
    setProjectRouteAdmin(true);
    setBrowserPath(getProjectFolderPath(folderId, true));
    setShowDatasetLibraryModal(false);
    setShowFontLibraryModal(false);
    setShowTemplateLibraryModal(true);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
    setPendingTemplateUploads([]);
    setPreviewTemplate(null);
    setProjectFolderId(folderId);
    setSelectedTemplateFolderId(folderId);
    setProjectListingMode("home");
    setProjectDesignPage(1);
    setProjectSearch("");
    setProjectFolderDetailTab("designs");
    setIsDesignsCollapsed(false);
  }

  function closeTemplateLibraryModal() {
    setShowTemplateLibraryModal(false);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
    setPendingTemplateUploads([]);
    setPreviewTemplate(null);
    setEditingTemplateFolderId(null);
    setOpenTemplateFolderMenuId(null);
  }

  function closeManagementPages() {
    closeTemplateLibraryModal();
    closeDatasetLibraryModal();
    closeFontLibraryModal();
  }

  function applyProjectRoute(route: ProjectRoute | null) {
    setPreviewTemplate(null);
    setProjectDesignPage(1);
    if (!route) {
      setShowTemplateLibraryModal(false);
      setProjectFolderId(null);
      setProjectRouteAdmin(false);
      setProjectListingMode("home");
      return;
    }

    setProjectRouteAdmin(route.admin);

    if (route.kind === "design-detail") {
      activatePage(route.id, { updatePath: false });
      return;
    }

    setShowDatasetLibraryModal(false);
    setShowFontLibraryModal(false);
    setShowTemplateLibraryModal(true);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);

    if (route.kind === "folder-detail") {
      setProjectFolderId(route.id);
      setProjectListingMode("home");
      setSelectedTemplateFolderId(route.id);
      return;
    }

    setProjectFolderId(null);
    setSelectedTemplateFolderId(fallbackTemplateFolderId);
    setProjectListingMode(route.kind === "folders" ? "folders" : route.kind === "designs" ? "designs" : "home");
  }

  function selectTemplateFolder(folderId: string) {
    setSelectedTemplateFolderId(folderId);
    setSelectedTemplateIds([]);
    setPendingTemplateUploads([]);
    setTemplateLibraryError("");
    setOpenTemplateFolderMenuId(null);
  }

  function createTemplateFolder(parentId: string | null) {
    if (!isAdmin) return;
    if (parentId) {
      const parentFolder = appState.templateFolders.find((folder) => folder.id === parentId);
      if (parentFolder?.parentId) {
        setTemplateLibraryError("Chỉ được tạo dự án con trong dự án gốc");
        return;
      }
    }
    const nextFolder: TemplateFolder = {
      id: uid("folder"),
      name: "Dự án mới",
      parentId,
      createdAt: new Date().toISOString()
    };
    setAppState((current) => ({
      ...current,
      templateFolders: [...current.templateFolders, nextFolder]
    }));
    setSelectedTemplateFolderId(nextFolder.id);
    setEditingTemplateFolderId(nextFolder.id);
    setOpenTemplateFolderMenuId(null);
    setTemplateLibraryError("");
  }

  function renameTemplateFolder(folderId: string, name: string) {
    if (!isAdmin) return;
    setAppState((current) => ({
      ...current,
      templateFolders: current.templateFolders.map((folder) =>
        folder.id === folderId ? { ...folder, name } : folder
      )
    }));
  }

  function finishRenameTemplateFolder(folderId: string, name: string) {
    if (!name.trim()) renameTemplateFolder(folderId, "Dự án chưa đặt tên");
    setEditingTemplateFolderId(null);
  }

  function collectTemplateFolderIds(folderId: string, folders = appState.templateFolders) {
    const ids = new Set<string>([folderId]);
    let changed = true;
    while (changed) {
      changed = false;
      folders.forEach((folder) => {
        if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
          ids.add(folder.id);
          changed = true;
        }
      });
    }
    return ids;
  }

  function deleteTemplateFolder(folderId: string) {
    if (!isAdmin) return;
    if (appState.templateFolders.length <= 1) {
      setTemplateLibraryError("Phải giữ lại ít nhất 1 dự án");
      setOpenTemplateFolderMenuId(null);
      return;
    }
    const folderIdsToDelete = collectTemplateFolderIds(folderId);
    if (folderIdsToDelete.size >= appState.templateFolders.length) {
      setTemplateLibraryError("Không thể xóa toàn bộ dự án");
      setOpenTemplateFolderMenuId(null);
      return;
    }
    const folderName =
      appState.templateFolders.find((folder) => folder.id === folderId)?.name || "dự án này";
    if (!window.confirm(`Xóa "${folderName}" và toàn bộ dự án con, ảnh bên trong?`)) {
      setOpenTemplateFolderMenuId(null);
      return;
    }
    const remainingFolders = appState.templateFolders.filter(
      (folder) => !folderIdsToDelete.has(folder.id)
    );
    const fallbackFolderId = remainingFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID;
    setAppState((current) => {
      const nextFolders = current.templateFolders.filter(
        (folder) => !folderIdsToDelete.has(folder.id)
      );
      const nextFolderId = nextFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID;
      return {
        ...current,
        templateFolders: nextFolders,
        imageFolders: current.imageFolders.filter(
          (folder) => !folderIdsToDelete.has(folder.projectFolderId)
        ),
        templateImages: current.templateImages.filter(
          (item) => !folderIdsToDelete.has(item.folderId)
        )
      };
    });
    setSelectedTemplateFolderId(fallbackFolderId);
    setSelectedPickerFolderId(fallbackFolderId);
    setSelectedTemplateIds([]);
    setPendingTemplateUploads([]);
    setEditingTemplateFolderId(null);
    setOpenTemplateFolderMenuId(null);
    setTemplateLibraryError("");
  }

  function openTemplatePickerModal() {
    if (!isAdminWorkspace) return;
    setShowTemplatePickerModal(true);
    setSelectedPickerFolderId(currentTemplateFolderId);
    setSelectedPickerImageFolderId("");
    setSelectedPickerTemplateId(null);
  }

  function closeTemplatePickerModal() {
    setShowTemplatePickerModal(false);
    setSelectedPickerImageFolderId("");
    setSelectedPickerTemplateId(null);
  }

  function applyTemplateImageToCurrentTemplate(templateId: string) {
    if (!isAdminWorkspace) return;
    const sourceTemplate = appState.templateImages.find((item) => item.id === templateId);
    if (!sourceTemplate || !getTemplateLibraryImage(sourceTemplate)) return;
    updateTemplate((current) => ({
      ...current,
      backgroundDataUrl: getTemplateLibraryImage(sourceTemplate),
      updatedAt: new Date().toISOString()
    }));
    setZoomLevel(1);
    closeTemplatePickerModal();
  }

  function removeCurrentTemplateImage() {
    if (!isAdminWorkspace) return;
    if (!template.backgroundDataUrl) return;
    updateTemplate((current) => ({
      ...current,
      backgroundDataUrl: "",
      updatedAt: new Date().toISOString()
    }));
  }

  async function prepareTemplateUpload(file: File | undefined) {
    await prepareTemplateUploads(file ? [file] : []);
  }

  async function prepareTemplateUploads(files: Array<File | undefined | null>) {
    if (!isAdmin) return;
    const imageFiles = files.filter((file): file is File => Boolean(file && file.type.startsWith("image/")));
    if (!imageFiles.length) return;
    setTemplateLibraryError("");

    const preparedUploads = await Promise.all(
      imageFiles.map(async (file) => {
        const dataUrl = await fileToDataUrl(file);
        const image = await loadHtmlImage(dataUrl);
        const optimized = await optimizeImageForServerUpload(file);
        return {
          id: uid("upload"),
          name: file.name.replace(/\.[^.]+$/, "") || "Ảnh mẫu mới",
          dataUrl,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          file,
          optimizedFile: optimized.file,
          optimizedWidth: optimized.width,
          optimizedHeight: optimized.height,
          status: "ready" as const
        };
      })
    );

    setPendingTemplateUploads((current) => [...current.filter((item) => item.status !== "saved"), ...preparedUploads]);
  }

  function updatePendingTemplateUpload(uploadId: string, patch: Partial<PendingTemplateUpload>) {
    setPendingTemplateUploads((current) =>
      current.map((item) => (item.id === uploadId ? { ...item, ...patch } : item))
    );
  }

  async function savePendingTemplateUpload() {
    const uploadsToSave = pendingTemplateUploads.filter((item) => item.status !== "saved");
    if (!uploadsToSave.length || !isAdmin) return;
    if (!selectedTemplateFolder) {
      setTemplateLibraryError("Vui lòng tạo hoặc chọn dự án trước khi tải ảnh");
      return;
    }
    const targetFolderId = activeTemplateFolderId;
    const targetImageFolderId =
      activeProjectFolder?.id === targetFolderId ? activeProjectImageFolderId : undefined;
    setIsUploadingAsset(true);
    setTemplateLibraryError("");
    const savedImages: TemplateImage[] = [];

    for (const upload of uploadsToSave) {
      updatePendingTemplateUpload(upload.id, { status: "uploading", error: undefined });
      let assetUrl = upload.dataUrl;
      let width = upload.width;
      let height = upload.height;
      try {
        if (remoteSyncEnabledRef.current) {
          const uploaded = await uploadAssetToCloudinary(upload.optimizedFile, "image");
          assetUrl = uploaded.url;
          width = uploaded.width || upload.optimizedWidth;
          height = uploaded.height || upload.optimizedHeight;
        }
        savedImages.push({
          id: uid("image"),
          name: upload.name.trim() || "Ảnh mẫu mới",
          folderId: targetFolderId,
          imageFolderId: targetImageFolderId,
          width,
          height,
          dataUrl: assetUrl,
          createdAt: new Date().toISOString()
        });
        updatePendingTemplateUpload(upload.id, { status: "saved" });
      } catch (error) {
        updatePendingTemplateUpload(upload.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Không tải ảnh lên được"
        });
      }
    }
    if (savedImages.length) {
      setAppState((current) => ({
        ...current,
        templateImages: [...savedImages.reverse(), ...current.templateImages]
      }));
    }
    setIsUploadingAsset(false);
    const failedCount = uploadsToSave.length - savedImages.length;
    if (failedCount) {
      setPendingTemplateUploads((current) => current.filter((item) => item.status !== "saved"));
      setTemplateLibraryError(`${failedCount} ảnh chưa tải lên được. Vui lòng thử lại.`);
    } else {
      setPendingTemplateUploads([]);
      setTemplateLibraryError("");
    }
  }

  async function uploadImagesToLibraryFolder(
    files: Array<File | undefined | null>,
    targetFolderId: string,
    targetImageFolderId?: string
  ) {
    if (isUploadingAsset) return;
    const imageFiles = files.filter((file): file is File => Boolean(file && file.type.startsWith("image/")));
    if (!imageFiles.length) return;
    setIsUploadingAsset(true);
    setTemplateLibraryError("");

    try {
      const savedImages: TemplateImage[] = [];
      for (const file of imageFiles) {
        const dataUrl = await fileToDataUrl(file);
        const image = await loadHtmlImage(dataUrl);
        const optimized = await optimizeImageForServerUpload(file);
        let assetUrl = dataUrl;
        let width = image.naturalWidth || image.width;
        let height = image.naturalHeight || image.height;

        if (remoteSyncEnabledRef.current) {
          const uploaded = await uploadAssetToCloudinary(optimized.file, "image");
          assetUrl = uploaded.url;
          width = uploaded.width || optimized.width;
          height = uploaded.height || optimized.height;
        }

        savedImages.push({
          id: uid("image"),
          name: file.name.replace(/\.[^.]+$/, "") || "Ảnh mới",
          folderId: targetFolderId,
          imageFolderId: targetImageFolderId,
          width,
          height,
          dataUrl: assetUrl,
          createdAt: new Date().toISOString()
        });
      }

      if (savedImages.length) {
        setAppState((current) => ({
          ...current,
          templateImages: [...savedImages.reverse(), ...current.templateImages]
        }));
        showDownloadToast(`Đã tải lên ${savedImages.length} ảnh`);
      }
    } catch (error) {
      setTemplateLibraryError(error instanceof Error ? error.message : "Không tải ảnh lên được");
      showDownloadToast("Không tải ảnh lên được");
    } finally {
      setIsUploadingAsset(false);
    }
  }

  async function uploadEffectAssets(files: Array<File | undefined | null>) {
    if (!isAdminWorkspace || isUploadingAsset) return;
    const imageFiles = files.filter((file): file is File =>
      Boolean(file && (file.type === "image/png" || file.type === "image/webp"))
    );
    if (!imageFiles.length) {
      showDownloadToast("Chỉ hỗ trợ hiệu ứng PNG hoặc WebP");
      return;
    }
    setIsUploadingAsset(true);
    try {
      const savedEffects: EffectAsset[] = [];
      for (const file of imageFiles) {
        const dataUrl = await fileToDataUrl(file);
        const image = await loadHtmlImage(dataUrl);
        const optimized = await optimizeImageForServerUpload(file);
        let assetUrl = dataUrl;
        let width = image.naturalWidth || image.width;
        let height = image.naturalHeight || image.height;
        if (remoteSyncEnabledRef.current) {
          const uploaded = await uploadAssetToCloudinary(optimized.file, "image");
          assetUrl = uploaded.url;
          width = uploaded.width || optimized.width;
          height = uploaded.height || optimized.height;
        }
        savedEffects.push({
          id: uid("effect"),
          name: file.name.replace(/\.[^.]+$/, "") || "Hiệu ứng mới",
          folderId: "global_effects",
          width,
          height,
          dataUrl: assetUrl,
          createdAt: new Date().toISOString()
        });
      }
      if (savedEffects.length) {
        setAppState((current) => ({
          ...current,
          effectAssets: [...savedEffects.reverse(), ...current.effectAssets]
        }));
        showDownloadToast(`Đã tải lên ${savedEffects.length} hiệu ứng`);
      }
    } catch (error) {
      showDownloadToast(error instanceof Error ? error.message : "Không tải được hiệu ứng");
    } finally {
      setIsUploadingAsset(false);
    }
  }

  function addEffectToCanvas(effect: EffectAsset) {
    if (!isAdmin) {
      placeImageInFrame(effect, undefined, undefined, false);
      return;
    }
    if (isAdminWorkspace) {
      placeImageInFrame(effect, undefined, undefined, false);
      return;
    }

    const dataUrl = getTemplateLibraryImage(effect);
    if (!dataUrl) return;
    const size = getContainedImageSize(
      effect,
      Math.min(420, Math.max(180, Math.round(template.width * 0.32))),
      Math.min(420, Math.max(180, Math.round(template.height * 0.32)))
    );
    const layer: TextLayer = {
      id: uid("image"),
      name: effect.name || "Effect",
      kind: "shape",
      shapeVariant: "image",
      column: "",
      x: Math.max(0, Math.round((template.width - size.width) / 2)),
      y: Math.max(0, Math.round((template.height - size.height) / 2)),
      width: size.width,
      height: size.height,
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
      fontWeight: "600",
      color: "#071025",
      fill: "#ffffff",
      stroke: "#8b3dff",
      strokeWidth: 0,
      cornerRadius: 0,
      opacity: 1,
      imageDataUrl: dataUrl,
      imageName: effect.name,
      imageOriginalWidth: effect.width,
      imageOriginalHeight: effect.height,
      imageUsage: "standalone",
      align: "left",
      lineHeight: 1.16,
      letterSpacing: 0,
      textTransform: "none",
      createdByClient: false
    };
    const nextState: AppState = {
      ...appState,
      templates: appState.templates.map((item) =>
        item.id === template.id
          ? { ...item, updatedAt: new Date().toISOString(), layers: [...item.layers, layer] }
          : item
      )
    };
    setAppState(nextState);
    setSelectedLayerIds([layer.id]);
    setActiveCanvasTool("move");
    void saveAdminStateToCloud(nextState);
  }

  function deleteEffectAsset(effectId: string) {
    if (!isAdminWorkspace) return;
    setAppState((current) => ({
      ...current,
      effectAssets: current.effectAssets.filter((effect) => effect.id !== effectId)
    }));
  }
  async function uploadImagesToCurrentTemplateFolder(files: Array<File | undefined | null>) {
    if (!isAdminWorkspace) return;
    await uploadImagesToLibraryFolder(
      files,
      currentTemplateFolderId,
      activePanelImageFolderId || undefined
    );
  }

  async function prepareProjectFolderImages(files: File[]) {
    if (!isAdminProjectManager || !activeProjectFolder || projectFolderDetailTab !== "images") return;
    setSelectedTemplateFolderId(activeProjectFolder.id);
    await uploadImagesToLibraryFolder(
      files,
      activeProjectFolder.id,
      activeProjectImageFolderId || undefined
    );
  }

  function handleProjectImageDragOver(event: React.DragEvent<HTMLElement>) {
    if (!isAdminProjectManager || !activeProjectFolder || projectFolderDetailTab !== "images") return;
    if (!Array.from(event.dataTransfer.items || []).some((item) => item.type.startsWith("image/"))) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleProjectImageDrop(event: React.DragEvent<HTMLElement>) {
    if (!isAdminProjectManager || !activeProjectFolder || projectFolderDetailTab !== "images") return;
    const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    void prepareProjectFolderImages(files);
  }

  function activatePage(templateId: string, options: { updatePath?: boolean } = {}) {
    const nextTemplate = appState.templates.find((item) => item.id === templateId);
    if (!nextTemplate) return;
    if (options.updatePath !== false) {
      setBrowserPath(getProjectDesignPath(templateId, projectRouteAdmin || isAdminPath));
    }
    closeManagementPages();
    setShowSettingsMenu(false);
    setAppState((current) => ({
      ...current,
      activeTemplateId: templateId
    }));
    setSelectedLayerIds(nextTemplate.layers[0] ? [nextTemplate.layers[0].id] : []);
    setZoomLevel(1);
  }

  function openProjectItem(item: { id: string; kind: "design" | "template" }) {
    if (item.kind === "design") {
      activatePage(item.id);
      return;
    }
    const image = appState.templateImages.find((candidate) => candidate.id === item.id);
    if (image) setPreviewTemplate(image);
  }

  function openProjectFolder(folderId: string, tab: ProjectFolderDetailTab = "designs") {
    setBrowserPath(getProjectFolderPath(folderId, projectRouteAdmin));
    setProjectFolderId(folderId);
    setProjectListingMode("home");
    setProjectFolderDetailTab(tab);
    setProjectDesignPage(1);
    setProjectSearch("");
  }

  function createPageInFolder(folderId?: string, name?: string) {
    const currentState = appStateRef.current;
    const nextName = name?.trim() || getNextPageName(currentState.templates);
    const nextTemplate: Template = {
      id: uid("template"),
      name: nextName,
      folderId: folderId || currentState.templateFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID,
      width: DEFAULT_TEMPLATE_WIDTH,
      height: DEFAULT_TEMPLATE_HEIGHT,
      backgroundDataUrl: "",
      layers: [],
      updatedAt: new Date().toISOString()
    };
    const nextState = {
      ...currentState,
      templates: [nextTemplate, ...currentState.templates],
      activeTemplateId: nextTemplate.id
    };
    appStateRef.current = nextState;
    setBrowserPath(getProjectDesignPath(nextTemplate.id, projectRouteAdmin || isAdminPath));
    closeManagementPages();
    setShowSettingsMenu(false);
    setAppState(nextState);
    setEditingPageId(null);
    setSelectedLayerIds(nextTemplate.layers[0] ? [nextTemplate.layers[0].id] : []);
    setZoomLevel(1);
  }

  function addPage() {
    createPageInFolder();
  }

  function openCreateDesignModal(folderId: string) {
    setPendingDesignFolderId(folderId);
    setNewDesignName("");
    setTemplateLibraryError("");
  }

  function closeCreateDesignModal() {
    setPendingDesignFolderId(null);
    setNewDesignName("");
  }

  function submitCreateDesign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newDesignName.trim();
    if (!name) {
      setTemplateLibraryError("Vui lòng nhập tên thiết kế");
      return;
    }
    createPageInFolder(pendingDesignFolderId || undefined, name);
    closeCreateDesignModal();
  }

  function deletePage(templateId: string) {
    const currentState = appStateRef.current;
    if (currentState.templates.length <= 1) return;
    const currentIndex = currentState.templates.findIndex((item) => item.id === templateId);
    const remaining = currentState.templates.filter((item) => item.id !== templateId);
    const fallbackTemplate =
      remaining[Math.min(Math.max(currentIndex, 0), remaining.length - 1)] || remaining[0];
    const nextState: AppState = {
      ...currentState,
      templates: remaining,
      activeTemplateId:
        currentState.activeTemplateId === templateId ? fallbackTemplate.id : currentState.activeTemplateId
    };

    if (isAdminWorkspace) {
      skipNextRemoteSaveRef.current = true;
    }
    setAppState(nextState);
    if (isAdminWorkspace) {
      void saveAdminStateToCloud(nextState, {
        savingMessage: "Đang xóa thiết kế...",
        savedMessage: "Đã xóa thiết kế",
        toastMessage: "Đã xóa thiết kế"
      });
    }

    if (currentState.activeTemplateId === templateId) {
      setSelectedLayerIds(fallbackTemplate.layers[0] ? [fallbackTemplate.layers[0].id] : []);
      setZoomLevel(1);
    }
    if (editingPageId === templateId) {
      setEditingPageId(null);
    }
    if (pagePendingDeleteId === templateId) {
      setPagePendingDeleteId(null);
    }
  }

  function confirmPendingPageDelete() {
    if (!pagePendingDelete) return;
    deletePage(pagePendingDelete.id);
  }

  function finishEditingPage(templateId: string, name: string) {
    if (!name.trim()) renameTemplate(templateId, "Trang");
    setEditingPageId(null);
  }

  function renameTemplate(templateId: string, name: string) {
    setAppState((current) => ({
      ...current,
      templates: current.templates.map((item) =>
        item.id === templateId
          ? { ...item, name, updatedAt: new Date().toISOString() }
          : item
      )
    }));
  }

  function duplicateTemplate(templateId: string) {
    if (!isAdmin) return;
    setAppState((current) => {
      const sourceTemplate = current.templates.find((item) => item.id === templateId);
      if (!sourceTemplate) return current;
      const duplicatedTemplate: Template = {
        ...sourceTemplate,
        id: uid("template"),
        name: getDuplicateTemplateName(sourceTemplate.name, current.templates),
        layers: sourceTemplate.layers.map((layer) => ({ ...layer, id: uid("layer") })),
        updatedAt: new Date().toISOString()
      };
      const sourceIndex = current.templates.findIndex((item) => item.id === templateId);
      const templates = [...current.templates];
      templates.splice(Math.max(sourceIndex, 0), 0, duplicatedTemplate);
      return {
        ...current,
        templates
      };
    });
    setTemplateLibraryError("");
  }

  function openPageSizeMenu() {
    if (!isAdminWorkspace) return;
    setPageSizeDraft({
      name: template.name,
      width: String(template.width),
      height: String(template.height)
    });
    setShowDownloadMenu(false);
    setShowPageSizeMenu((current) => !current);
  }

  function applyPageSizeDraft() {
    if (!isAdminWorkspace) return;
    const width = Math.round(Number(pageSizeDraft.width));
    const height = Math.round(Number(pageSizeDraft.height));
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    const nextWidth = Math.min(10000, Math.max(64, width));
    const nextHeight = Math.min(10000, Math.max(64, height));
    const nextName = pageSizeDraft.name.trim() || template.name;

    updateTemplate((current) => ({
      ...current,
      name: nextName,
      width: nextWidth,
      height: nextHeight,
      updatedAt: new Date().toISOString()
    }));
    setPageSizeDraft({
      name: nextName,
      width: String(nextWidth),
      height: String(nextHeight)
    });
    setShowPageSizeMenu(false);
    setZoomLevel(1);
  }

  function renameTemplateImage(imageId: string, name: string) {
    setAppState((current) => ({
      ...current,
      templateImages: current.templateImages.map((item) =>
        item.id === imageId ? { ...item, name } : item
      )
    }));
  }

  function createImageFolder(projectFolderId: string) {
    if (!isAdmin) return;
    const name = window.prompt("Tên folder ảnh", "Folder ảnh mới")?.trim();
    if (!name) return;
    const nextFolder: ImageFolder = {
      id: uid("image_folder"),
      name,
      projectFolderId,
      createdAt: new Date().toISOString()
    };
    setAppState((current) => ({
      ...current,
      imageFolders: [...current.imageFolders, nextFolder]
    }));
    setSelectedProjectImageFolderId(nextFolder.id);
    setSelectedPanelImageFolderId(nextFolder.id);
    setOpenImageFolderMenuId(null);
  }

  function renameImageFolder(imageFolderId: string) {
    if (!isAdmin) return;
    const folder = appState.imageFolders.find((item) => item.id === imageFolderId);
    if (!folder) return;
    const name = window.prompt("Tên folder ảnh", folder.name)?.trim();
    if (!name) return;
    setAppState((current) => ({
      ...current,
      imageFolders: current.imageFolders.map((item) =>
        item.id === imageFolderId ? { ...item, name } : item
      )
    }));
    setOpenImageFolderMenuId(null);
  }

  function deleteImageFolder(imageFolderId: string) {
    if (!isAdmin) return;
    const folderName = appState.imageFolders.find((folder) => folder.id === imageFolderId)?.name || "folder này";
    if (!window.confirm(`Xóa "${folderName}"? Ảnh bên trong sẽ được đưa về Tất cả ảnh.`)) {
      setOpenImageFolderMenuId(null);
      return;
    }
    setAppState((current) => ({
      ...current,
      imageFolders: current.imageFolders.filter((folder) => folder.id !== imageFolderId),
      templateImages: current.templateImages.map((image) =>
        image.imageFolderId === imageFolderId ? { ...image, imageFolderId: undefined } : image
      )
    }));
    setSelectedProjectImageFolderId((current) => (current === imageFolderId ? "" : current));
    setSelectedPanelImageFolderId((current) => (current === imageFolderId ? "" : current));
    setOpenImageFolderMenuId(null);
  }

  function moveTemplateImagesToImageFolder(imageIds: string[], imageFolderId: string | undefined) {
    if (!isAdmin || !imageIds.length) return;
    const targetFolder = imageFolderId
      ? appState.imageFolders.find((folder) => folder.id === imageFolderId)
      : null;
    const uniqueIds = new Set(imageIds);
    setAppState((current) => ({
      ...current,
      templateImages: current.templateImages.map((image) => {
        if (!uniqueIds.has(image.id)) return image;
        if (targetFolder && image.folderId !== targetFolder.projectFolderId) return image;
        return { ...image, imageFolderId };
      })
    }));
    setSelectedTemplateIds((current) => current.filter((id) => !uniqueIds.has(id)));
  }

  function imageDragIdsFromEvent(event: ReactDragEvent<HTMLElement>, fallbackId?: string) {
    const rawIds = event.dataTransfer.getData("application/x-template-image-ids");
    if (rawIds) {
      try {
        const parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === "string" && Boolean(id));
        }
      } catch {
        // Ignore malformed drag payloads and use the single-image fallback below.
      }
    }
    const imageId = event.dataTransfer.getData("application/x-template-image-id") || fallbackId || "";
    return imageId ? [imageId] : [];
  }

  function toggleTemplateSelection(templateId: string) {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
    );
  }

  function deleteSelectedTemplates() {
    if (!selectedTemplateIds.length || !isAdmin) return;
    const selectedCount = selectedTemplateIds.length;
    if (!window.confirm(`Xóa ${selectedCount} ảnh đã chọn?`)) return;
    setAppState((current) => {
      return {
        ...current,
        templateImages: current.templateImages.filter(
          (item) => !selectedTemplateIds.includes(item.id)
        )
      };
    });
    setSelectedTemplateIds([]);
    setTemplateLibraryError("");
  }

  function deleteSelectedProjectImages() {
    if (!selectedProjectImageIds.length || !isAdmin) return;
    setPendingProjectImageDeleteIds(selectedProjectImageIds);
  }

  function confirmDeleteSelectedProjectImages() {
    if (!pendingProjectImageDeleteIds.length || !isAdmin) return;
    const idsToDelete = new Set(pendingProjectImageDeleteIds);
    setAppState((current) => ({
      ...current,
      templateImages: current.templateImages.filter((item) => !idsToDelete.has(item.id))
    }));
    setSelectedTemplateIds((current) => current.filter((id) => !idsToDelete.has(id)));
    setPendingProjectImageDeleteIds([]);
    setTemplateLibraryError("");
  }

  function deleteTemplateImage(imageId: string) {
    if (!isAdmin) return;
    setAppState((current) => ({
      ...current,
      templateImages: current.templateImages.filter((item) => item.id !== imageId)
    }));
    setSelectedTemplateIds((current) => current.filter((id) => id !== imageId));
    setTemplateLibraryError("");
  }

  function openFontLibraryModal() {
    if (!isAdmin) return;
    setShowTemplateLibraryModal(false);
    setShowDatasetLibraryModal(false);
    setShowFontLibraryModal(true);
    setShowSettingsMenu(false);
    setFontLibraryError("");
  }

  function closeFontLibraryModal() {
    setShowFontLibraryModal(false);
    setFontLibraryError("");
  }

  async function handleFontUpload(files: FileList | File[] | undefined | null) {
    if (!files || !isAdmin) return;
    const fontFiles = Array.from(files).filter(
      (file) =>
        /\.(woff2?|ttf|otf)$/i.test(file.name) &&
        !file.name.startsWith("._") &&
        file.size > 1024
    );
    if (!fontFiles.length) {
      setFontLibraryError("Chỉ hỗ trợ file font thật `.woff`, `.woff2`, `.ttf`, `.otf`.");
      return;
    }

    try {
      const fonts = await Promise.all(
        fontFiles.map(async (file) => {
          const { family, styleName, fontWeight, fontStyle } = fontInfoFromFileName(file.name);
          const dataUrl = remoteSyncEnabledRef.current
            ? (await uploadAssetToCloudinary(file, "raw")).url
            : await fileToDataUrl(file);
          const font = { family, dataUrl, fileName: file.name, styleName, fontWeight, fontStyle };
          await registerFont(font).catch(() => undefined);
          return font;
        })
      );
      setAppState((current) => ({
        ...current,
        customFonts: [
          ...current.customFonts.filter(
            (item) =>
              !fonts.some(
                (font) => font.family === item.family && font.styleName === item.styleName
              )
          ),
          ...fonts
        ]
      }));
      setFontLibraryError("");
    } catch (error) {
      setFontLibraryError(error instanceof Error ? error.message : "Không tải được font");
    }
  }

  function deleteFontFamily(family: string) {
    setAppState((current) => {
      const fallbackFont = BASE_FONTS[0];
      return {
        ...current,
        customFonts: current.customFonts.filter((font) => font.family !== family),
        templates: current.templates.map((item) => ({
          ...item,
          layers: item.layers.map((layer) =>
            layer.fontFamily === family ? { ...layer, fontFamily: fallbackFont } : layer
          )
        }))
      };
    });
  }

  function datasetFromMatrix(matrix: unknown[][], name: string): PendingDataset | null {
    const columns = (matrix[0] || [])
      .map((cell) => String(cell).trim())
      .filter(Boolean);

    const rows = matrix
      .slice(1)
      .map((line) =>
        columns.reduce<RowData>((record, column, index) => {
          record[column] = String(line[index] ?? "").trim();
          return record;
        }, {})
      )
      .filter((record) => Object.values(record).some(Boolean));

    if (!columns.length || !rows.length) return null;

    return {
      name,
      columns,
      rows,
      keyColumn: guessKeyColumn(columns)
    };
  }

  async function pendingDatasetFromFile(file: File) {
    let matrix: unknown[][];

    if (/\.csv$/i.test(file.name)) {
      const Papa = (await import("papaparse")).default;
      const parsed = Papa.parse<string[]>(await file.text(), {
        skipEmptyLines: true
      });
      if (parsed.errors.length) {
        throw new Error(parsed.errors[0]?.message || "Không đọc được file CSV");
      }
      matrix = parsed.data;
    } else {
      const readXlsxFile = (await import("read-excel-file/browser")).default;
      matrix = (await readXlsxFile(file)) as unknown as unknown[][];
    }

    const nextDataset = datasetFromMatrix(matrix, file.name.replace(/\.[^.]+$/, ""));
    if (!nextDataset) throw new Error("File không có cột hoặc dòng dữ liệu hợp lệ");
    return {
      ...nextDataset,
      sourceKind: "upload" as const,
      sourceName: file.name,
      sourceMimeType: file.type || undefined,
      sourceSize: file.size,
      sourceFile: file
    };
  }

  function publicGoogleSheetCsvUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) throw new Error("Vui lòng nhập link Google Sheet public");
    const parsed = new URL(trimmed);
    const sheetId = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
    if (!sheetId) return trimmed;
    const gid = parsed.hash.match(/gid=([^&]+)/)?.[1] || parsed.searchParams.get("gid") || "0";
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
  }

  async function pendingDatasetFromPublicSheet(url: string) {
    const csvUrl = publicGoogleSheetCsvUrl(url);
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Không tải được Google Sheet (${response.status})`);
    }
    const Papa = (await import("papaparse")).default;
    const parsed = Papa.parse<string[]>(await response.text(), {
      skipEmptyLines: true
    });
    if (parsed.errors.length) {
      throw new Error(parsed.errors[0]?.message || "Không đọc được Google Sheet");
    }
    const nextDataset = datasetFromMatrix(parsed.data, "Google Sheet public");
    if (!nextDataset) throw new Error("Sheet không có cột hoặc dòng dữ liệu hợp lệ");
    return {
      ...nextDataset,
      sourceKind: "google-sheet" as const,
      sourceName: "Google Sheet public",
      sourceUrl: url.trim()
    };
  }

  async function prepareDatasetReview(source: Promise<PendingDataset>) {
    if (!isAdmin) return;
    setDataImportError("");
    setIsReadingData(true);
    try {
      const nextDataset = await source;
      setPendingDataset(nextDataset);
    } catch (error) {
      setDataImportError(error instanceof Error ? error.message : "Không đọc được dữ liệu");
    } finally {
      setIsReadingData(false);
      setIsDraggingDataFile(false);
    }
  }

  function openDatasetLibraryModal() {
    if (!isAdmin) return;
    setShowTemplateLibraryModal(false);
    setShowFontLibraryModal(false);
    setShowDatasetLibraryModal(true);
    setShowSettingsMenu(false);
    setDatasetLibraryError("");
    setSelectedDatasetIds([]);
  }

  function closeDatasetLibraryModal() {
    setShowDatasetLibraryModal(false);
    setDatasetLibraryError("");
    setSelectedDatasetIds([]);
    setPreviewDatasetId(null);
    setDatasetSearch("");
    setIsDataImportInline(false);
    closeDataImportModal();
  }

  function openDataImportFromLibrary() {
    setIsDataImportInline(false);
    openDataImportModal();
  }

  function openDataImportModal() {
    if (!isAdmin) return;
    setShowDataImportModal(true);
    setPendingDataset(null);
    setDataImportError("");
  }

  function closeDataImportModal() {
    setShowDataImportModal(false);
    setIsDataImportInline(false);
    setPendingDataset(null);
    setDataImportError("");
    setIsReadingData(false);
    setIsUploadingDataset(false);
    setIsDraggingDataFile(false);
  }

  function toggleDatasetSelection(datasetId: string) {
    setDatasetLibraryError("");
    setSelectedDatasetIds((current) =>
      current.includes(datasetId)
        ? current.filter((id) => id !== datasetId)
        : [...current, datasetId]
    );
  }

  function renameDataset(datasetId: string, name: string) {
    if (!isAdmin) return;
    setAppState((current) => ({
      ...current,
      datasets: current.datasets.map((item) =>
        item.id === datasetId ? { ...item, name } : item
      )
    }));
  }

  function deleteSelectedDatasets() {
    if (!isAdmin || !selectedDatasetIds.length) return;

    setAppState((current) => {
      const datasets = current.datasets.filter(
        (item) => !selectedDatasetIds.includes(item.id)
      );
      const activeDatasetId = datasets.some((item) => item.id === current.activeDatasetId)
        ? current.activeDatasetId
        : "";
      return {
        ...current,
        datasets,
        activeDatasetId
      };
    });
    setSelectedDatasetIds([]);
    setPreviewDatasetId((current) =>
      current && selectedDatasetIds.includes(current) ? null : current
    );
    setSelectedRowIndex(0);
    setDatasetLibraryError("");
  }

  function deleteDataset(datasetId: string) {
    if (!isAdmin) return;

    setAppState((current) => {
      const datasets = current.datasets.filter((item) => item.id !== datasetId);
      const activeDatasetId = datasets.some((item) => item.id === current.activeDatasetId)
        ? current.activeDatasetId
        : "";
      return {
        ...current,
        datasets,
        activeDatasetId
      };
    });
    setSelectedDatasetIds((current) => current.filter((id) => id !== datasetId));
    setPreviewDatasetId((current) => (current === datasetId ? null : current));
    setSelectedRowIndex(0);
    setDatasetLibraryError("");
  }

  async function commitPendingDataset() {
    if (!pendingDataset || !isAdmin || isUploadingDataset) return;

    const { sourceFile, ...pendingDatasetData } = pendingDataset;
    let datasetData: Omit<Dataset, "id" | "importedAt"> = pendingDatasetData;

    if (sourceFile && remoteSyncEnabledRef.current) {
      setIsUploadingDataset(true);
      setDataImportError("");
      try {
        const uploaded = await uploadAssetToCloudinary(sourceFile, "raw");
        datasetData = {
          ...pendingDatasetData,
          sourceKind: "upload",
          sourceName: pendingDatasetData.sourceName || sourceFile.name,
          sourceMimeType: pendingDatasetData.sourceMimeType || sourceFile.type || undefined,
          sourceSize: pendingDatasetData.sourceSize || sourceFile.size,
          sourceUrl: uploaded.url
        };
      } catch (error) {
        setDataImportError(
          error instanceof Error ? error.message : "Không tải file dữ liệu lên Cloudinary được"
        );
        setIsUploadingDataset(false);
        return;
      }
      setIsUploadingDataset(false);
    }

    const dataset: Dataset = {
      id: uid("dataset"),
      ...datasetData,
      importedAt: new Date().toISOString()
    };

    setAppState((current) => ({
      ...current,
      datasets: [dataset, ...current.datasets]
    }));
    setSelectedRowIndex(0);
    closeDataImportModal();
    setShowDatasetLibraryModal(true);
  }

  function getDropPoint(event: React.DragEvent<HTMLDivElement>) {
    const rect = stageRef.current?.container().getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.round((event.clientX - rect.left) / stageScale)),
      y: Math.max(0, Math.round((event.clientY - rect.top) / stageScale))
    };
  }

  function resetCanvasCursor() {
    const stage = stageRef.current;
    if (stage) stage.container().style.cursor = "";
  }

  function findShapeLayerAtPoint(point: { x: number; y: number }) {
    return [...template.layers]
      .reverse()
      .find((layer) => {
        if (!canUseFrameSlot(layer)) return false;
        const width = layer.width;
        const height = layer.height || layer.width;
        return (
          point.x >= layer.x &&
          point.x <= layer.x + width &&
          point.y >= layer.y &&
          point.y <= layer.y + height
        );
      });
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!canEditWorkspace) return;
    const point = getDropPoint(event);
    if (!point) return;

    const imageId = event.dataTransfer.getData("application/x-template-image-id");
    if (imageId) {
      const image = appState.templateImages.find((item) => item.id === imageId);
      if (!image) return;
      const targetFrame = findShapeLayerAtPoint(point);
      placeImageInFrame(image, targetFrame?.id, point, false);
      return;
    }

    const column = event.dataTransfer.getData("text/column");
    if (!column) return;
    addTextLayer(column, point.x, point.y);
  }

  function getLogicalPointer() {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return null;
    return {
      x: pointer.x / stageScale,
      y: pointer.y / stageScale
    };
  }

  function getLogicalPointFromClient(clientX: number, clientY: number) {
    const stage = stageRef.current;
    const rect = stage?.container().getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (clientX - rect.left) / stageScale,
      y: (clientY - rect.top) / stageScale
    };
  }

  function updateImageCropGuideNodes(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const overlay = imageCropGuideOverlayRef.current;
    if (overlay) {
      overlay.style.left = `${rect.x * stageScale}px`;
      overlay.style.top = `${rect.y * stageScale}px`;
      overlay.style.width = `${rect.width * stageScale}px`;
      overlay.style.height = `${rect.height * stageScale}px`;
    }
    const guideRect = imageCropGuideRectRef.current;
    if (!guideRect) return;
    guideRect.position({ x: rect.x, y: rect.y });
    guideRect.size({ width: rect.width, height: rect.height });
    const points = getVisibleImageCropGuideHandlePoints(rect);
    points.forEach(([x, y], index) => {
      imageCropGuideHandleRefs.current[index]?.position({ x, y });
    });
    guideRect.getLayer()?.batchDraw();
  }

  // The image content may extend outside the template while cropping. Keep the
  // resize handles inside the stage so there is always a visible way to zoom
  // the image back out.
  function getVisibleImageCropGuideHandlePoints(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const inset = Math.max(6, 7 / stageScale);
    const clampToStage = (value: number, max: number) =>
      Math.min(Math.max(value, inset), Math.max(inset, max - inset));
    return [
      [clampToStage(rect.x, template.width), clampToStage(rect.y, template.height)],
      [
        clampToStage(rect.x + rect.width, template.width),
        clampToStage(rect.y, template.height)
      ],
      [
        clampToStage(rect.x + rect.width, template.width),
        clampToStage(rect.y + rect.height, template.height)
      ],
      [
        clampToStage(rect.x, template.width),
        clampToStage(rect.y + rect.height, template.height)
      ]
    ];
  }

  function getImageCropGuideRectForLayer(layer: TextLayer, zoom = layer.imageCropZoom) {
    if (
      !isShapeLayer(layer) ||
      !layer.imageDataUrl ||
      isStandaloneImageLayer(layer) ||
      !layer.imageOriginalWidth ||
      !layer.imageOriginalHeight
    ) {
      return null;
    }
    const rect = getCoverImageContentRect(
      {
        width: layer.imageOriginalWidth,
        height: layer.imageOriginalHeight
      },
      layer.width,
      layer.height || layer.width,
      layer.imageCropFocusX,
      layer.imageCropFocusY,
      zoom
    );
    return rect
      ? {
          x: layer.x + rect.x,
          y: layer.y + rect.y,
          width: rect.width,
          height: rect.height
        }
      : null;
  }

  function beginCanvasSelection(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!canEditWorkspace) return;
    if ("button" in event.evt && event.evt.button === 1) return;
    blurActiveEditableTarget();
    setLayerContextMenu(null);
    const isStageOrBackground =
      event.target === event.target.getStage() || event.target.name() === "background";
    if (!isStageOrBackground) return;
    if (imageCropEditLayerId) {
      imageCropDragRef.current = null;
      imageCropScaleRef.current = null;
      resetCanvasCursor();
      setImageCropPreviewFocus(null);
      setImageCropEditLayerId(null);
    }
    const pointer = getLogicalPointer();
    if (!pointer) return;
    if (activeCanvasTool === "text") {
      addFreeTextLayer(Math.round(pointer.x), Math.round(pointer.y));
      return;
    }
    if (activeCanvasTool !== "move") return;
    selectionStartRef.current = pointer;
    isSelectingRef.current = true;
    setSelectionBox({ visible: true, x: pointer.x, y: pointer.y, width: 0, height: 0 });
  }

  function beginWorkspaceSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !canEditWorkspace || activeCanvasTool !== "move") return;
    const pointer = getLogicalPointFromClient(event.clientX, event.clientY);
    if (!pointer) return;
    selectionStartRef.current = pointer;
    isSelectingRef.current = true;
    setSelectionBox({ visible: true, x: pointer.x, y: pointer.y, width: 0, height: 0 });
  }

  function updateWorkspaceSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (!isSelectingRef.current || !selectionStartRef.current) return;
    const pointer = getLogicalPointFromClient(event.clientX, event.clientY);
    if (!pointer) return;
    const start = selectionStartRef.current;
    setSelectionBox({ visible: true, x: start.x, y: start.y, width: pointer.x - start.x, height: pointer.y - start.y });
  }

  function finishWorkspaceSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (!isSelectingRef.current) return;
    finishCanvasSelection(getLogicalPointFromClient(event.clientX, event.clientY));
  }

  function updateCanvasSelection() {
    if (!isSelectingRef.current || !selectionStartRef.current) return;
    const pointer = getLogicalPointer();
    if (!pointer) return;
    const start = selectionStartRef.current;
    setSelectionBox({
      visible: true,
      x: start.x,
      y: start.y,
      width: pointer.x - start.x,
      height: pointer.y - start.y
    });
  }

  function finishCanvasSelection(pointerOverride?: { x: number; y: number } | null) {
    if (!isSelectingRef.current || !selectionStartRef.current) return;
    const pointer =
      pointerOverride &&
      Number.isFinite(pointerOverride.x) &&
      Number.isFinite(pointerOverride.y)
        ? pointerOverride
        : getLogicalPointer();
    const start = selectionStartRef.current;
    const rawSelection = pointer
      ? {
          visible: true,
          x: start.x,
          y: start.y,
          width: pointer.x - start.x,
          height: pointer.y - start.y
        }
      : selectionBox;
    const normalizedSelection = normalizeBox(rawSelection);
    const didDrag = normalizedSelection.width > 4 || normalizedSelection.height > 4;
    if (!didDrag) {
      setSelectedLayerIds([]);
    } else {
      const selectedIds = template.layers
        .filter((layer) => {
          const box = getLayerBounds(layer);
          return boxesIntersect(normalizedSelection, box, MARQUEE_SELECTION_TOLERANCE);
        })
        .map((layer) => layer.id);
      setSelectedLayerIds(selectedIds);
    }
    isSelectingRef.current = false;
    selectionStartRef.current = null;
    setSelectionBox((current) => ({ ...current, visible: false }));
  }

  function selectLayerFromCanvas(
    layerId: string,
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    if ("button" in event.evt && event.evt.button === 1) return;
    blurActiveEditableTarget();
    setLayerContextMenu(null);
    // The text tool must work over existing images and shapes as well as on
    // blank canvas. Previously a layer click switched back to Move first.
    if (activeCanvasTool === "text") {
      const pointer = getLogicalPointer();
      if (pointer) {
        event.cancelBubble = true;
        addFreeTextLayer(Math.round(pointer.x), Math.round(pointer.y));
      }
      return;
    }
    if (imageCropEditLayerId && imageCropEditLayerId !== layerId) {
      imageCropDragRef.current = null;
      imageCropScaleRef.current = null;
      resetCanvasCursor();
      setImageCropPreviewFocus(null);
      setImageCropEditLayerId(null);
    }
    if (activeCanvasTool !== "move") {
      setActiveCanvasTool("move");
    }
    const nativeEvent = event.evt as MouseEvent;
    if ("shiftKey" in nativeEvent && (nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey)) {
      setSelectedLayerIds((current) => {
        const next = current.includes(layerId)
          ? current.filter((id) => id !== layerId)
          : [...current, layerId];
        selectedLayerIdsRef.current = next;
        return next;
      });
      return;
    }
    if (selectedLayerIds.length > 1 && selectedLayerIds.includes(layerId)) {
      return;
    }
    selectedLayerIdsRef.current = [layerId];
    setSelectedLayerIds([layerId]);
  }

  function openLayerContextMenu(
    layerId: string,
    event: Konva.KonvaEventObject<MouseEvent>
  ) {
    if (!canEditWorkspace || imageCropEditLayerId || !canEditLayerById(layerId)) return;
    event.evt.preventDefault();
    event.cancelBubble = true;
    setSelectedLayerIds((current) => (current.includes(layerId) ? current : [layerId]));
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    setLayerContextMenu({
      layerId,
      x: pointer.x,
      y: pointer.y
    });
  }

  function moveLayerOrder(layerId: string, direction: "front" | "forward" | "backward" | "back") {
    if (!canEditWorkspace || !canEditLayerById(layerId)) return;
    updateTemplate((current) => {
      const index = current.layers.findIndex((layer) => layer.id === layerId);
      if (index === -1) return current;
      if (
        (direction === "front" && index === current.layers.length - 1) ||
        (direction === "forward" && index === current.layers.length - 1) ||
        (direction === "backward" && index === 0) ||
        (direction === "back" && index === 0)
      ) {
        return current;
      }
      const layers = [...current.layers];
      const [layer] = layers.splice(index, 1);
      const nextIndex =
        direction === "front"
          ? layers.length
          : direction === "back"
            ? 0
            : direction === "forward"
              ? Math.min(layers.length, index + 1)
              : Math.max(0, index - 1);
      layers.splice(nextIndex, 0, layer);
      return {
        ...current,
        updatedAt: new Date().toISOString(),
        layers
      };
    });
    setSelectedLayerIds([layerId]);
    setLayerContextMenu(null);
    requestAnimationFrame(() => transformerRef.current?.forceUpdate());
  }

  function deleteLayerFromContextMenu(layerId: string) {
    if (!canEditLayerById(layerId)) return;
    setSelectedLayerIds([layerId]);
    setLayerContextMenu(null);
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.filter((layer) => layer.id !== layerId)
    }));
  }

  function beginFrameImageCropEdit(
    layerId: string,
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    const layer = template.layers.find((item) => item.id === layerId);
    if (
      !canUseFrameSlot(layer) ||
      !layer.imageDataUrl
    ) {
      return;
    }
    event.cancelBubble = true;
    setSelectedLayerIds([layerId]);
    setActiveCanvasTool("move");
    setImageCropPreviewFocus({
      layerId,
      x: clamp01(layer.imageCropFocusX),
      y: clamp01(layer.imageCropFocusY),
      zoom: clampImageCropZoom(layer.imageCropZoom)
    });
    setImageCropEditLayerId(layerId);
  }

  function handleImageCropDragStart(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    if (imageCropEditLayerId !== layerId || !canUseFrameSlotById(layerId)) return;
    const layer = template.layers.find((item) => item.id === layerId);
    const pointer = getLogicalPointer();
    if (!isShapeLayer(layer) || !pointer) return;
    event.cancelBubble = true;
    const lockedAbsolutePosition = event.target.absolutePosition();
    event.target.dragBoundFunc(() => lockedAbsolutePosition);
    imageCropDragRef.current = {
      layerId,
      startPointer: pointer,
      startFocusX: clamp01(layer.imageCropFocusX),
      startFocusY: clamp01(layer.imageCropFocusY),
      startZoom: clampImageCropZoom(layer.imageCropZoom),
      nextFocusX: clamp01(layer.imageCropFocusX),
      nextFocusY: clamp01(layer.imageCropFocusY),
      nextZoom: clampImageCropZoom(layer.imageCropZoom),
      lockedAbsolutePosition
    };
    setImageCropPreviewFocus({
      layerId,
      x: clamp01(layer.imageCropFocusX),
      y: clamp01(layer.imageCropFocusY),
      zoom: clampImageCropZoom(layer.imageCropZoom)
    });
    event.target.position({ x: layer.x, y: layer.y });
  }

  function handleImageCropDragMove(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    const drag = imageCropDragRef.current;
    if (!drag || drag.layerId !== layerId) return;
    const layer = template.layers.find((item) => item.id === layerId);
    const pointer = getLogicalPointer();
    const node = event.target as Konva.Image;
    const image = node.image() as { width?: number; height?: number } | undefined;
    if (!isShapeLayer(layer) || !pointer || !image?.width || !image?.height) return;
    event.cancelBubble = true;
    const width = Math.max(1, layer.width);
    const height = Math.max(1, layer.height || layer.width);
    const startCrop = getCoverCrop(
      { width: image.width, height: image.height },
      width,
      height,
      drag.startFocusX,
      drag.startFocusY,
      drag.startZoom
    );
    if (!startCrop) return;
    const maxCropX = Math.max(0, image.width - startCrop.width);
    const maxCropY = Math.max(0, image.height - startCrop.height);
    const deltaX = pointer.x - drag.startPointer.x;
    const deltaY = pointer.y - drag.startPointer.y;
    const nextFocusX =
      maxCropX > 0
        ? clamp01(drag.startFocusX - (deltaX * startCrop.width) / (width * maxCropX))
        : 0.5;
    const nextFocusY =
      maxCropY > 0
        ? clamp01(drag.startFocusY - (deltaY * startCrop.height) / (height * maxCropY))
        : 0.5;
    drag.nextFocusX = nextFocusX;
    drag.nextFocusY = nextFocusY;
    node.position({ x: layer.x, y: layer.y });
    const imageSize = { width: image.width, height: image.height };
    node.crop(getCoverCrop(imageSize, width, height, nextFocusX, nextFocusY, drag.startZoom));
    const guideRect = getCoverImageContentRect(
      imageSize,
      width,
      height,
      nextFocusX,
      nextFocusY,
      drag.startZoom
    );
    if (guideRect) {
      updateImageCropGuideNodes({
        x: layer.x + guideRect.x,
        y: layer.y + guideRect.y,
        width: guideRect.width,
        height: guideRect.height
      });
    }
    node.getLayer()?.batchDraw();
  }

  function handleImageCropDragEnd(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    const drag = imageCropDragRef.current;
    const layer = template.layers.find((item) => item.id === layerId);
    if (!drag || drag.layerId !== layerId || !isShapeLayer(layer)) return;
    event.cancelBubble = true;
    event.target.dragBoundFunc(null);
    event.target.position({ x: layer.x, y: layer.y });
    const nextFocusX = Number(drag.nextFocusX.toFixed(4));
    const nextFocusY = Number(drag.nextFocusY.toFixed(4));
    imageCropDragRef.current = null;
    setImageCropPreviewFocus(null);
    setImageCropEditLayerId(null);
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((item) =>
        item.id === layerId
          ? {
              ...item,
              imageCropFocusX: nextFocusX,
              imageCropFocusY: nextFocusY,
              imageCropZoom: Number(drag.nextZoom.toFixed(4))
            }
          : item
      )
    }));
  }

  function handleImageCropScaleStart(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    if (imageCropEditLayerId !== layerId || !canUseFrameSlotById(layerId)) return;
    const layer = template.layers.find((item) => item.id === layerId);
    const pointer = getLogicalPointer();
    if (!isShapeLayer(layer) || !pointer) return;
    const guideRect = getImageCropGuideRectForLayer(layer);
    if (!guideRect) return;
    event.cancelBubble = true;
    const center = {
      x: guideRect.x + guideRect.width / 2,
      y: guideRect.y + guideRect.height / 2
    };
    const startDistance = Math.max(1, Math.hypot(pointer.x - center.x, pointer.y - center.y));
    const startZoom = clampImageCropZoom(layer.imageCropZoom);
    imageCropScaleRef.current = {
      layerId,
      startPointer: pointer,
      startZoom,
      nextZoom: startZoom,
      center,
      startDistance
    };
    setImageCropPreviewFocus({
      layerId,
      x: clamp01(layer.imageCropFocusX),
      y: clamp01(layer.imageCropFocusY),
      zoom: startZoom
    });
  }

  function handleImageCropScaleMove(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    const scaleDrag = imageCropScaleRef.current;
    if (!scaleDrag || scaleDrag.layerId !== layerId) return;
    const layer = template.layers.find((item) => item.id === layerId);
    const pointer = getLogicalPointer();
    if (!isShapeLayer(layer) || !pointer) return;
    event.cancelBubble = true;
    const distance = Math.max(1, Math.hypot(pointer.x - scaleDrag.center.x, pointer.y - scaleDrag.center.y));
    const nextZoom = clampImageCropZoom(scaleDrag.startZoom * (distance / scaleDrag.startDistance));
    scaleDrag.nextZoom = nextZoom;
    const imageNode = layerRefs.current[layerId];
    if (imageNode instanceof Konva.Image && layer.imageOriginalWidth && layer.imageOriginalHeight) {
      const nextCrop = getCoverCrop(
        { width: layer.imageOriginalWidth, height: layer.imageOriginalHeight },
        layer.width,
        layer.height || layer.width,
        layer.imageCropFocusX,
        layer.imageCropFocusY,
        nextZoom
      );
      if (nextCrop) imageNode.crop(nextCrop);
      imageNode.getLayer()?.batchDraw();
    }
    const guideRect = getImageCropGuideRectForLayer(layer, nextZoom);
    if (guideRect) {
      updateImageCropGuideNodes(guideRect);
    }
  }

  function handleImageCropScaleEnd(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    const scaleDrag = imageCropScaleRef.current;
    const layer = template.layers.find((item) => item.id === layerId);
    if (!scaleDrag || scaleDrag.layerId !== layerId || !isShapeLayer(layer)) return;
    event.cancelBubble = true;
    const nextZoom = Number(scaleDrag.nextZoom.toFixed(4));
    imageCropScaleRef.current = null;
    resetCanvasCursor();
    setImageCropPreviewFocus(null);
    setImageCropEditLayerId(null);
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((item) =>
        item.id === layerId
          ? {
              ...item,
              imageCropZoom: nextZoom
            }
          : item
      )
    }));
  }

  function syncLayerTransformOverlayNode(node: Konva.Node) {
    const overlay = layerTransformOverlayRef.current;
    if (!overlay) return;
    overlay.style.left = `${node.x() * stageScale}px`;
    overlay.style.top = `${node.y() * stageScale}px`;
    overlay.style.width = `${node.width() * (node.scaleX() || 1) * stageScale}px`;
    overlay.style.height = `${node.height() * (node.scaleY() || 1) * stageScale}px`;
  }

  function syncSelectedLayerTransformOverlay() {
    if (!selectedLayer) return;
    const node = layerRefs.current[selectedLayer.id];
    if (node) syncLayerTransformOverlayNode(node);
  }

  function handleLayerDragStart(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    setAlignmentGuides([]);
    if (!canEditLayerById(layerId)) {
      groupDragRef.current = null;
      event.target.stopDrag();
      return;
    }
    const movingIds = selectedLayerIds.filter((id) => canEditLayerById(id));
    if (!movingIds.includes(layerId) || movingIds.length < 2) {
      groupDragRef.current = null;
      return;
    }
    groupDragRef.current = {
      activeLayerId: layerId,
      startX: event.target.x(),
      startY: event.target.y(),
      positions: movingIds.reduce<Record<string, { x: number; y: number }>>(
        (positions, id) => {
          const node = layerRefs.current[id];
          if (node) positions[id] = { x: node.x(), y: node.y() };
          return positions;
        },
        {}
      )
    };
  }

  function handleLayerDragMove(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    if (!canEditLayerById(layerId)) return;
    const groupDrag = groupDragRef.current;
    if (groupDrag && groupDrag.activeLayerId === layerId) {
      const deltaX = event.target.x() - groupDrag.startX;
      const deltaY = event.target.y() - groupDrag.startY;
      selectedLayerIds.filter((id) => canEditLayerById(id)).forEach((id) => {
        if (id === layerId) return;
        const node = layerRefs.current[id];
        const position = groupDrag.positions[id];
        if (node && position) {
          node.position({ x: position.x + deltaX, y: position.y + deltaY });
        }
      });
    }
    updateAlignmentGuidesForDrag(layerId);
    syncSelectedLayerTransformOverlay();
  }

  function handleLayerDragEnd(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    if (!canEditLayerById(layerId)) return;
    const groupDrag = groupDragRef.current;
    if (groupDrag && groupDrag.activeLayerId === layerId) {
      const nextPositions = selectedLayerIds.filter((id) => canEditLayerById(id)).reduce<Record<string, { x: number; y: number }>>(
        (positions, id) => {
          const node = layerRefs.current[id];
          if (node) positions[id] = { x: Math.round(node.x()), y: Math.round(node.y()) };
          return positions;
        },
        {}
      );
      updateTemplate((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        layers: current.layers.map((item) =>
          nextPositions[item.id] ? { ...item, ...nextPositions[item.id] } : item
        )
      }));
      groupDragRef.current = null;
      setAlignmentGuides([]);
      return;
    }

    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((item) =>
        item.id === layerId
          ? {
              ...item,
              x: Math.round(event.target.x()),
              y: Math.round(event.target.y())
            }
          : item
      )
    }));
    setAlignmentGuides([]);
  }

  function normalizeLayerResizeNode(
    node: Konva.Text | Konva.Rect | Konva.Image,
    layer: TextLayer | undefined
  ) {
    const nextWidth = Math.max(isShapeLayer(layer) ? 24 : 80, node.width() * node.scaleX());
    node.width(nextWidth);
    if (isShapeLayer(layer)) {
      node.height(Math.max(24, node.height() * node.scaleY()));
    }
    if (node instanceof Konva.Image && !isStandaloneImageLayer(layer)) {
      const image = node.image() as { width?: number; height?: number } | undefined;
      if (image?.width && image?.height) {
        const nextCrop = getCoverCrop(
          { width: image.width, height: image.height },
          node.width(),
          node.height(),
          layer?.imageCropFocusX,
          layer?.imageCropFocusY,
          layer?.imageCropZoom
        );
        if (nextCrop) node.crop(nextCrop);
      }
    } else if (node instanceof Konva.Image) {
      node.crop(undefined);
    }
    node.scaleX(1);
    node.scaleY(1);
    node.getLayer()?.batchDraw();
    transformerRef.current?.forceUpdate();
    return {
      width: node.width(),
      height: isShapeLayer(layer) ? node.height() : undefined
    };
  }

  function updateShapeToolbarPreview(width: number, height: number, cornerRadius: number) {
    if (shapeWidthInputRef.current) shapeWidthInputRef.current.value = String(Math.round(width));
    if (shapeHeightInputRef.current) shapeHeightInputRef.current.value = String(Math.round(height));
    if (shapeRadiusInputRef.current) {
      shapeRadiusInputRef.current.value = String(Math.round(cornerRadius));
    }
  }

  function handleLayerTransform(layerId: string, event: Konva.KonvaEventObject<Event>) {
    const layer = template.layers.find((item) => item.id === layerId);
    if (!canEditLayer(layer)) return;
    const nextSize = normalizeLayerResizeNode(
      event.target as Konva.Text | Konva.Rect | Konva.Image,
      layer
    );
    if (isShapeLayer(layer) && nextSize.height) {
      updateShapeToolbarPreview(
        nextSize.width,
        nextSize.height,
        layer.shapeVariant === "circle"
          ? Math.min(nextSize.width, nextSize.height) / 2
          : getCornerRadiusPreviewValue(layer)
      );
    }
    syncSelectedLayerTransformOverlay();
  }

  function handleLayerTransformEnd(layerId: string, event: Konva.KonvaEventObject<Event>) {
    const node = event.target as Konva.Text | Konva.Rect | Konva.Image;
    const layer = template.layers.find((item) => item.id === layerId);
    if (!canEditLayer(layer)) return;
    const nextSize = normalizeLayerResizeNode(node, layer);
    if (isShapeLayer(layer) && nextSize.height) {
      updateShapeToolbarPreview(
        nextSize.width,
        nextSize.height,
        layer.shapeVariant === "circle"
          ? Math.min(nextSize.width, nextSize.height) / 2
          : getCornerRadiusPreviewValue(layer)
      );
    }
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((item) =>
        item.id === layerId
          ? {
              ...item,
              x: Math.round(node.x()),
              y: Math.round(node.y()),
              rotation: Math.round(node.rotation()),
              width: Math.round(node.width()),
              ...(isShapeLayer(item) ? { height: Math.round(node.height()) } : {})
            }
          : item
      )
    }));
  }

  function changeZoom(delta: number) {
    setCanvasCenterAsZoomAnchor();
    setZoomLevel((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))))
    );
  }

  function setZoomFromSlider(value: string) {
    const nextZoom = Number(value) / 100;
    setCanvasCenterAsZoomAnchor();
    setZoomLevel(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2)))));
  }

  function setCanvasCenterAsZoomAnchor() {
    const shell = canvasShellRef.current;
    const stage = stageRef.current;
    if (!shell || !stage) return;
    const shellRect = shell.getBoundingClientRect();
    const stageRect = stage.container().getBoundingClientRect();
    zoomAnchorRef.current = {
      pointerX: shellRect.width / 2,
      pointerY: shellRect.height / 2,
      logicalX: (shellRect.width / 2 - (stageRect.left - shellRect.left)) / stageScale,
      logicalY: (shellRect.height / 2 - (stageRect.top - shellRect.top)) / stageScale
    };
  }

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!isZoomShortcutPressedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  function beginCanvasPan(event: React.PointerEvent<HTMLDivElement>) {
    const shouldPan = event.button === 1 || (activeCanvasTool === "hand" && event.button === 0);
    if (!shouldPan) return;
    event.preventDefault();
    event.stopPropagation();
    const shell = event.currentTarget;
    canvasPanRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: shell.scrollLeft,
      scrollTop: shell.scrollTop
    };
    setIsCanvasPanning(true);
    shell.setPointerCapture?.(event.pointerId);
  }

  function updateCanvasPan(event: React.PointerEvent<HTMLDivElement>) {
    const pan = canvasPanRef.current;
    if (!pan) return;
    event.preventDefault();
    const shell = event.currentTarget;
    shell.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
    shell.scrollTop = pan.scrollTop - (event.clientY - pan.y);
  }

  function finishCanvasPan(event?: React.PointerEvent<HTMLDivElement>) {
    if (!canvasPanRef.current) return;
    event?.currentTarget.releasePointerCapture?.(event.pointerId);
    canvasPanRef.current = null;
    setIsCanvasPanning(false);
  }

  function clearCanvasSelectionFromBlankArea(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const isBlankCanvas =
      event.target === event.currentTarget || target.classList?.contains("canvas-workspace");
    if (!isBlankCanvas) return;
    if (canvasPanRef.current) return;
    setSelectedLayerIds([]);
    setLayerContextMenu(null);
    setImageCropPreviewFocus(null);
    setImageCropEditLayerId(null);
  }

  function fitCanvasToFrame() {
    setZoomLevel(1);
  }

  async function exportImage(pixelRatio: 1 | 0.75 | 0.5, mimeType: "image/png" | "image/jpeg") {
    const stage = stageRef.current;
    if (!stage || isExporting) return false;
    setIsExporting(true);
    const transformer = transformerRef.current;
    const cropGuideNodes = stage.find(".image-crop-guide");
    transformer?.visible(false);
    cropGuideNodes.forEach((node) => node.visible(false));
    transformer?.getLayer()?.batchDraw();
    const currentScale = stage.scaleX();
    const currentWidth = stage.width();
    const currentHeight = stage.height();
    try {
      await document.fonts.ready;
      stage.scale({ x: 1, y: 1 });
      stage.size({ width: template.width, height: template.height });
      stage.batchDraw();
      const dataUrl = stage.toDataURL({
        pixelRatio,
        mimeType,
        quality: mimeType === "image/jpeg" ? 0.92 : undefined
      });
      const ext = mimeType === "image/jpeg" ? "jpg" : "png";
      const sizeLabel = pixelRatio === 1 ? "full" : `${String(pixelRatio).replace(".", "_")}x`;
      downloadDataUrl(
        dataUrl,
        `${getExportName(template, selectedRow, dataset.keyColumn)}_${sizeLabel}.${ext}`
      );
      return true;
    } finally {
      stage.scale({ x: currentScale, y: currentScale });
      stage.size({ width: currentWidth, height: currentHeight });
      cropGuideNodes.forEach((node) => node.visible(true));
      transformer?.visible(Boolean(selectedLayerIds.length) && !imageCropEditLayerId);
      transformer?.getLayer()?.batchDraw();
      setIsExporting(false);
    }
  }

  function showDownloadToast(message: string) {
    setDownloadToast(message);
    if (downloadToastTimeoutRef.current) {
      window.clearTimeout(downloadToastTimeoutRef.current);
    }
    downloadToastTimeoutRef.current = window.setTimeout(() => {
      setDownloadToast("");
      downloadToastTimeoutRef.current = null;
    }, 2400);
  }

  async function downloadFromTopbar() {
    setShowDownloadMenu(false);
    showDownloadToast("Đang tải ảnh...");
    const didDownload = await exportImage(
      Number(exportScale) as 1 | 0.75 | 0.5,
      exportMimeType
    );
    showDownloadToast(didDownload ? "Đã tải ảnh xuống" : "Không thể tải ảnh");
  }

  async function saveTemplateForClient() {
    if (!isAdminWorkspace) return;
    setShowDownloadMenu(false);
    const savedAt = new Date().toISOString();
    const currentState = appStateRef.current;
    const nextState: AppState = {
      ...currentState,
      templates: currentState.templates.map((item) =>
        item.id === currentState.activeTemplateId
          ? {
              ...item,
              updatedAt: savedAt
            }
          : item
      )
    };
    skipNextRemoteSaveRef.current = true;
    setAppState(nextState);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appStateForLocalBackup(nextState)));
      setStorageWarning("");
    } catch {
      if (!remoteSyncEnabledRef.current) {
        setStorageWarning(
          "Không lưu được dữ liệu vào trình duyệt vì dung lượng ảnh quá lớn. Trang mới vẫn dùng được trong phiên hiện tại."
        );
      }
    }

    await saveAdminStateToCloud(nextState, {
      savingMessage: "Đang lưu template...",
      savedMessage: "Đã lưu template",
      toastMessage: "Đã lưu template để client sử dụng"
    });
    return;

    if (remoteSyncEnabledRef.current && remoteStateReadyRef.current) {
      setCloudSync({
        status: "saving",
        message: "Đang lưu template..."
      });
      try {
        const response = await fetch("/api/state", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: persistedLibraryState(nextState),
            baseUpdatedAt: remoteStateUpdatedAtRef.current
          })
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          if (response.status === 401) {
            expireAdminSession();
            showDownloadToast("Phiên admin đã hết hạn, hãy đăng nhập lại");
            return;
          }
          if (response.status === 409) {
            remoteStateUpdatedAtRef.current =
              (data as { updatedAt?: string | null } | null)?.updatedAt || remoteStateUpdatedAtRef.current;
            throw new Error("Dữ liệu cloud đã thay đổi, hãy tải lại trang trước khi lưu");
          }
          throw new Error(errorMessageFromApi(data, "Không lưu được template"));
        }
        remoteStateUpdatedAtRef.current =
          (data as { savedAt?: string | null } | null)?.savedAt || remoteStateUpdatedAtRef.current;
        setCloudSync({
          status: "saved",
          message: "Đã lưu template"
        });
        showDownloadToast("Đã lưu template để client sử dụng");
        return;
      } catch (error) {
        setCloudSync({
          status: "error",
          message: error instanceof Error ? (error as Error).message : "Lỗi lưu template"
        });
        showDownloadToast("Không lưu được template lên cloud");
        return;
      }
    }

    setCloudSync({
      status: "saved",
      message: "Đã lưu template"
    });
    showDownloadToast("Đã lưu template để client sử dụng");
  }

  function resetLocalData() {
    if (!isAdmin) return;
    const fresh = createInitialState();
    setAppState(fresh);
    setSelectedRowIndex(0);
    setSelectedLayerIds(fresh.templates[0].layers[0] ? [fresh.templates[0].layers[0].id] : []);
  }

  if (!isAdmin && isAdminPath) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={handleAdminUnlock}>
          <div className="login-brand">
            <img src={ONEHOUSING_LOGO_URL} alt="OneHousing" className="login-logo" />
          </div>

          <div className="login-copy">
            <h1>Đăng nhập quản trị</h1>
            <p>Nhập tài khoản admin để quản lý ảnh mẫu, dữ liệu, phông chữ và chỉnh sửa thiết kế.</p>
          </div>

          <div className="form-group">
            <label htmlFor="admin-account-input">Tài khoản</label>
            <input
              id="admin-account-input"
              autoFocus
              value={adminLoginName}
              onChange={(event) => setAdminLoginName(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="admin-code-input">Mật khẩu</label>
            <input
              id="admin-code-input"
              type="password"
              value={adminCode}
              onChange={(event) => setAdminCode(event.target.value)}
            />
          </div>
          {adminError ? <div className="form-error">{adminError}</div> : null}
          <button type="submit" className="btn blue full">
            <Lock size={18} />
            Đăng nhập
          </button>
        </form>
      </main>
    );
  }

  const adminSettingsDialog = showAdminSettingsModal ? (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal" onSubmit={saveAdminSettings}>
        <div className="modal-head">
          <div className="modal-icon">
            <BadgeCheck size={22} />
          </div>
          <button
            type="button"
            className="icon-btn"
            title="Đóng"
            onClick={() => setShowAdminSettingsModal(false)}
          >
            <X size={18} />
          </button>
        </div>
        <h2>Tài khoản quản trị</h2>
        <div className="form-group">
          <label htmlFor="admin-new-password">Mật khẩu mới</label>
          <input
            id="admin-new-password"
            autoFocus
            type="password"
            value={adminNewPassword}
            onChange={(event) => setAdminNewPassword(event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="admin-confirm-password">Xác nhận mật khẩu</label>
          <input
            id="admin-confirm-password"
            type="password"
            value={adminConfirmPassword}
            onChange={(event) => setAdminConfirmPassword(event.target.value)}
          />
        </div>
        {adminSettingsError ? <div className="form-error">{adminSettingsError}</div> : null}
        {adminSettingsMessage ? (
          <div className="form-success">{adminSettingsMessage}</div>
        ) : null}
        <button type="submit" className="btn blue full">
          <Save size={18} />
          Lưu thay đổi
        </button>
      </form>
    </div>
  ) : null;

  if (showAccountManagerPage && isAdmin) {
    return (
      <div className="project-manager-shell">
        <header className="project-manager-header">
          <div className="project-manager-brand">
            <img src={ONEHOUSING_LOGO_URL} alt="OneHousing" />
          </div>
          <div className="project-account-menu-wrap" ref={projectAccountMenuRef}>
            <button
              type="button"
              className={showProjectAccountMenu ? "project-account-btn active" : "project-account-btn"}
              aria-expanded={showProjectAccountMenu}
              onClick={() => setShowProjectAccountMenu((current) => !current)}
            >
              <span>{adminDisplayName.slice(0, 1).toUpperCase()}</span>
              <strong>{adminDisplayName}</strong>
              <ChevronDown size={16} />
            </button>
            {showProjectAccountMenu ? (
              <div className="project-account-menu" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectAccountMenu(false);
                    openAdminSettings();
                  }}
                >
                  <Lock size={16} />
                  Đổi mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectAccountMenu(false);
                    logoutAdmin();
                  }}
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="project-main">
          <div className="account-manager-page">
            <button
              type="button"
              className="account-manager-back"
              onClick={closeAccountManager}
            >
              <ArrowLeft size={17} />
              <span>Quay lại</span>
            </button>

            <div className="account-manager-head">
              <div>
                <h1>Quản lý tài khoản</h1>
                <p>
                  Tạo tài khoản cho thành viên cùng sử dụng trang quản trị. Tài khoản Super
                  Admin không thể bị xóa.
                </p>
              </div>
              <button
                type="button"
                className="btn blue"
                onClick={() => {
                  setAccountManagerError("");
                  setAccountManagerMessage("");
                  setShowCreateMemberForm((current) => !current);
                }}
              >
                <UserPlus size={17} />
                Thêm thành viên
              </button>
            </div>

            {showCreateMemberForm ? (
              <form className="account-create-card" onSubmit={createMemberAccount}>
                <div className="account-create-grid">
                  <div className="form-group">
                    <label htmlFor="new-member-account">Tài khoản đăng nhập</label>
                    <input
                      id="new-member-account"
                      autoFocus
                      autoComplete="off"
                      value={newMemberAccount}
                      onChange={(event) => setNewMemberAccount(event.target.value)}
                      placeholder="vd: thanhvien01"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="new-member-name">Tên hiển thị</label>
                    <input
                      id="new-member-name"
                      autoComplete="off"
                      value={newMemberName}
                      onChange={(event) => setNewMemberName(event.target.value)}
                      placeholder="vd: Nguyễn Văn A"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="new-member-password">Mật khẩu</label>
                    <input
                      id="new-member-password"
                      type="password"
                      autoComplete="new-password"
                      value={newMemberPassword}
                      onChange={(event) => setNewMemberPassword(event.target.value)}
                    />
                  </div>
                </div>
                <div className="account-create-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setShowCreateMemberForm(false);
                      setNewMemberAccount("");
                      setNewMemberName("");
                      setNewMemberPassword("");
                    }}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn blue" disabled={accountManagerBusy}>
                    <Save size={17} />
                    Tạo tài khoản
                  </button>
                </div>
              </form>
            ) : null}

            {accountManagerError ? (
              <div className="form-error">{accountManagerError}</div>
            ) : null}
            {accountManagerMessage ? (
              <div className="form-success">{accountManagerMessage}</div>
            ) : null}

            {accountUsersLoading ? (
              <div className="account-list-empty">Đang tải danh sách tài khoản...</div>
            ) : !accountUsers.length ? (
              <div className="account-list-empty">Chưa có tài khoản nào để hiển thị.</div>
            ) : (
              <ul className="account-list">
                {accountUsers.map((user) => {
                  const isSelf = user.id === adminUserId;
                  const isSuperAdminRow = user.role === "super_admin";
                  const canRename = isSelf && !isSuperAdminRow;
                  const canResetPassword = isSelf || (isSuperAdmin && !isSuperAdminRow);
                  const canDelete = !isSuperAdminRow && !isSelf;
                  const isRenaming = canRename && editingOwnNameDraft !== null;
                  const isResetting = memberResetPasswordId === user.id;
                  return (
                    <li key={user.id} className="account-row">
                      <div className="account-row-main">
                        <span className="account-avatar">
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="account-row-info">
                          {isRenaming ? (
                            <div className="account-inline-edit">
                              <input
                                autoFocus
                                value={editingOwnNameDraft || ""}
                                onChange={(event) => setEditingOwnNameDraft(event.target.value)}
                                placeholder="Tên hiển thị"
                              />
                              <button
                                type="button"
                                className="btn blue small"
                                disabled={accountManagerBusy}
                                onClick={() => void saveOwnDisplayName()}
                              >
                                <Check size={15} />
                                Lưu
                              </button>
                              <button
                                type="button"
                                className="btn ghost small"
                                onClick={() => setEditingOwnNameDraft(null)}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <strong>{user.name}</strong>
                          )}
                          <span className="account-row-login">{user.account}</span>
                        </div>
                        <span
                          className={
                            isSuperAdminRow ? "account-role-badge super" : "account-role-badge"
                          }
                        >
                          {isSuperAdminRow ? <ShieldCheck size={14} /> : <Users size={14} />}
                          {isSuperAdminRow ? "Super Admin" : "Admin"}
                        </span>
                        {isSelf ? <span className="account-self-badge">Bạn</span> : null}
                      </div>

                      <div className="account-row-actions">
                        {canRename && !isRenaming ? (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Đổi tên hiển thị"
                            onClick={() => {
                              setAccountManagerError("");
                              setAccountManagerMessage("");
                              setMemberResetPasswordId(null);
                              setEditingOwnNameDraft(user.name);
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                        ) : null}
                        {canResetPassword ? (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Đổi mật khẩu"
                            onClick={() => {
                              setAccountManagerError("");
                              setAccountManagerMessage("");
                              setEditingOwnNameDraft(null);
                              setMemberResetPassword("");
                              setMemberResetPasswordId(isResetting ? null : user.id);
                            }}
                          >
                            <KeyRound size={16} />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Xóa tài khoản"
                            onClick={() => {
                              setAccountManagerError("");
                              setAccountManagerMessage("");
                              setMemberPendingDeleteId(user.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>

                      {isResetting ? (
                        <div className="account-inline-edit full">
                          <input
                            autoFocus
                            type="password"
                            autoComplete="new-password"
                            value={memberResetPassword}
                            onChange={(event) => setMemberResetPassword(event.target.value)}
                            placeholder="Mật khẩu mới"
                          />
                          <button
                            type="button"
                            className="btn blue small"
                            disabled={accountManagerBusy}
                            onClick={() => void saveMemberPassword(user)}
                          >
                            <Check size={15} />
                            Lưu
                          </button>
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={() => {
                              setMemberResetPasswordId(null);
                              setMemberResetPassword("");
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : null}

                      {memberPendingDeleteId === user.id ? (
                        <div className="account-delete-confirm">
                          <span>
                            Xóa tài khoản <strong>{user.account}</strong>? Thành viên này sẽ
                            không đăng nhập được nữa.
                          </span>
                          <div>
                            <button
                              type="button"
                              className="btn ghost small"
                              onClick={() => setMemberPendingDeleteId(null)}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              className="btn danger small"
                              disabled={accountManagerBusy}
                              onClick={() => void deleteMemberAccount(user)}
                            >
                              <Trash2 size={15} />
                              Xóa
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
        {adminSettingsDialog}
      </div>
    );
  }

  if (showTemplateLibraryModal) {
    return (
      <div className="project-manager-shell">
        <header className="project-manager-header">
          <div className="project-manager-brand">
            <img src={ONEHOUSING_LOGO_URL} alt="OneHousing" />
          </div>
          {isAdminProjectManager ? (
            <div className="project-account-menu-wrap" ref={projectAccountMenuRef}>
              <button
                type="button"
                className={showProjectAccountMenu ? "project-account-btn active" : "project-account-btn"}
                aria-expanded={showProjectAccountMenu}
                onClick={() => setShowProjectAccountMenu((current) => !current)}
              >
                <span>{adminDisplayName.slice(0, 1).toUpperCase()}</span>
                <strong>{adminDisplayName}</strong>
                <ChevronDown size={16} />
              </button>
              {showProjectAccountMenu ? (
                <div className="project-account-menu" role="menu">
                  <button type="button" onClick={openAccountManager}>
                    <Users size={16} />
                    Quản lý tài khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectAccountMenu(false);
                      openAdminSettings();
                    }}
                  >
                    <Lock size={16} />
                    Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProjectAccountMenu(false);
                      logoutAdmin();
                    }}
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        <main className="project-main">
          <section className="project-hero">
            <div className="project-hero-inner">
              <h1>{projectPageTitle}</h1>
              {!activeProjectFolder ? (
                <label className="project-search">
                  <Search size={24} />
                  <input
                    value={projectSearch}
                    onChange={(event) => setProjectSearch(event.target.value)}
                    placeholder={isClientProjectLibrary ? "T\u00ecm ki\u1ebfm m\u1eabu thi\u1ebft k\u1ebf" : "T\u00ecm ki\u1ebfm t\u00ean d\u1ef1 \u00e1n ho\u1eb7c m\u1eabu thi\u1ebft k\u1ebf"}
                  />
                  {projectSearch ? (
                    <button
                      type="button"
                      className="project-search-clear"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => setProjectSearch("")}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </label>
              ) : null}
            </div>
          </section>

          <section
            className="project-content"
            ref={projectContentRef}
            onDragOver={handleProjectImageDragOver}
            onDrop={handleProjectImageDrop}
          >
            {false && pendingTemplateUploads.length ? (
              <div className="project-upload-draft">
                <div className="project-upload-list">
                  {pendingTemplateUploads.map((upload) => (
                    <div key={upload.id} className={`project-upload-item ${upload.status}`}>
                      <img src={upload.dataUrl} alt="" />
                      <span>
                        {upload.status === "uploading"
                          ? "Đang tải lên"
                          : upload.status === "saved"
                            ? "Đã lưu"
                            : upload.status === "error"
                              ? upload.error || "Lỗi tải ảnh"
                              : "Chờ lưu"}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <label>
                    Tên mẫu
                    <input
                      value={pendingTemplateUploads[0]?.name || ""}
                      onChange={(event) =>
                        pendingTemplateUploads[0]
                          ? updatePendingTemplateUpload(pendingTemplateUploads[0].id, { name: event.target.value })
                          : undefined
                      }
                    />
                  </label>
                  <span>
                    {pendingTemplateUploadSaveCount} ảnh chờ lưu
                  </span>
                </div>
                <button type="button" className="project-secondary-btn" disabled={isUploadingAsset} onClick={() => setPendingTemplateUploads([])}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="project-primary-btn"
                  disabled={isUploadingAsset || !pendingTemplateUploadSaveCount}
                  onClick={savePendingTemplateUpload}
                >
                  Lưu tất cả
                </button>
              </div>
            ) : null}

            {templateLibraryError ? <div className="project-error">{templateLibraryError}</div> : null}

            {false && isAdminProjectManager && activeProjectFolder && projectFolderDetailTab === "images" ? (
              <div className="project-image-dropzone">
                <ImageUp size={22} />
                <div>
                  <strong>Kéo ảnh vào đây hoặc dán ảnh từ clipboard</strong>
                  <span>Có thể chọn nhiều ảnh từ máy, kéo thả nhiều ảnh hoặc copy ảnh rồi paste vào trang.</span>
                </div>
              </div>
            ) : null}

            {activeProjectFolder || projectListingMode !== "home" ? (
              <div className="project-folder-detail-head">
                <button
                  type="button"
                  className="project-back-btn"
                  onClick={() => {
                    setBrowserPath(getProjectHomePath(projectRouteAdmin));
                    setProjectFolderId(null);
                    setProjectListingMode("home");
                    setProjectDesignPage(1);
                    setSelectedTemplateFolderId(fallbackTemplateFolderId);
                    setProjectSearch("");
                  }}
                >
                  <ArrowLeft size={17} />
                  Quay lại tất cả dự án
                </button>
                {activeProjectFolder ? (
                  <div className="project-folder-toolbar">
                  <div className="project-detail-tabs" role="tablist" aria-label="Nội dung trong dự án">
                    <button
                      type="button"
                      className={projectFolderDetailTab === "designs" ? "active" : ""}
                      role="tab"
                      aria-selected={projectFolderDetailTab === "designs"}
                      onClick={() => setProjectFolderDetailTab("designs")}
                    >
                      Thiết kế
                      <span>{activeProjectFolderDesignCount}</span>
                    </button>
                    <button
                      type="button"
                      className={projectFolderDetailTab === "images" ? "active" : ""}
                      role="tab"
                      aria-selected={projectFolderDetailTab === "images"}
                      onClick={() => setProjectFolderDetailTab("images")}
                    >
                      Hình ảnh
                      <span>{activeProjectFolderImageCount}</span>
                    </button>
                  </div>
                  <label className="project-tab-search">
                    <Search size={20} />
                    <input
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                      placeholder={
                        projectFolderDetailTab === "images"
                          ? "Tìm kiếm hình ảnh"
                          : "Tìm kiếm thiết kế"
                      }
                    />
                    {projectSearch ? (
                      <button
                        type="button"
                        className="project-search-clear"
                        aria-label="Xóa tìm kiếm"
                        onClick={() => setProjectSearch("")}
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                  </label>
                  <div className="project-detail-action-row">
                    {isAdminProjectManager && projectFolderDetailTab === "designs" ? (
                      <button
                        type="button"
                        className="project-primary-btn"
                        onClick={() => openCreateDesignModal(activeProjectFolder.id)}
                      >
                        <Plus size={17} />
                        Tạo thiết kế mới
                      </button>
                    ) : isAdminProjectManager ? (
                      <div className="project-image-action-group">
                        <button
                          type="button"
                          className="project-secondary-btn"
                          onClick={() => createImageFolder(activeProjectFolder.id)}
                        >
                          <FolderPlus size={17} />
                          Tạo folder
                        </button>
                      <label className="project-primary-btn">
                        <ImageUp size={17} />
                        Tải ảnh lên
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onClick={() => setSelectedTemplateFolderId(activeProjectFolder.id)}
                          onChange={(event) => {
                            void prepareProjectFolderImages(Array.from(event.target.files || []));
                            event.target.value = "";
                          }}
                        />
                      </label>
                      </div>
                    ) : (
                      <span />
                    )}
                    <div className="project-detail-actions">
                      <button
                        type="button"
                        className="project-tool-icon-btn"
                        title={projectSortOrder === "newest" ? "Sắp xếp cũ nhất" : "Sắp xếp mới nhất"}
                        aria-label={projectSortOrder === "newest" ? "Sắp xếp cũ nhất" : "Sắp xếp mới nhất"}
                        onClick={() =>
                          setProjectSortOrder((current) => (current === "newest" ? "oldest" : "newest"))
                        }
                      >
                        <span key={projectSortOrder} className="project-tool-icon-motion">
                          {projectSortOrder === "newest" ? <ArrowUpDown size={20} /> : <ArrowDownUp size={20} />}
                        </span>
                      </button>
                      {showProjectViewToggle ? (
                        <button
                          type="button"
                          className="project-tool-icon-btn active"
                          title={projectViewMode === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}
                          aria-label={projectViewMode === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}
                          onClick={() => setProjectViewMode((current) => (current === "grid" ? "list" : "grid"))}
                        >
                          <span key={projectViewMode} className="project-tool-icon-motion">
                            {projectViewMode === "grid" ? <Columns3 size={20} /> : <Rows3 size={20} />}
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  </div>
                ) : (
                  <div className="project-detail-actions">
                    {showProjectViewToggle ? (
                      <button
                        type="button"
                        className="project-tool-icon-btn active"
                        title={projectViewMode === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}
                        aria-label={projectViewMode === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}
                        onClick={() => setProjectViewMode((current) => (current === "grid" ? "list" : "grid"))}
                      >
                        <span key={projectViewMode} className="project-tool-icon-motion">
                          {projectViewMode === "grid" ? <Columns3 size={20} /> : <Rows3 size={20} />}
                        </span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {isProjectCloudLoading ? (
              <div className="project-empty-state project-loading-state">
                <LoaderCircle size={34} />
                <strong>Đang tải dữ liệu cloud</strong>
                <span>Danh sách dự án và thiết kế sẽ hiện khi dữ liệu mới nhất sẵn sàng.</span>
              </div>
            ) : (
              <>
            {activeProjectFolder && projectFolderDetailTab === "images" ? (
              <section className="project-image-folder-strip" aria-label="Folder hình ảnh">
                <button
                  type="button"
                  className={
                    activeProjectImageFolderId
                      ? "project-image-folder-chip"
                      : "project-image-folder-chip active"
                  }
                  onClick={() => {
                    setSelectedProjectImageFolderId("");
                    setOpenImageFolderMenuId(null);
                  }}
                  onDragOver={(event) => {
                    if (!isAdminProjectManager) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    if (!isAdminProjectManager) return;
                    event.preventDefault();
                    moveTemplateImagesToImageFolder(imageDragIdsFromEvent(event), undefined);
                  }}
                >
                  <span>Tất cả ảnh</span>
                  <strong>{activeProjectFolderImageCount}</strong>
                </button>
                {activeProjectImageFolders.map((folder) => {
                  const imageCount = appState.templateImages.filter(
                    (image) => image.imageFolderId === folder.id
                  ).length;
                  return (
                    <div
                      key={folder.id}
                      role="button"
                      tabIndex={0}
                      className={
                        activeProjectImageFolderId === folder.id
                          ? "project-image-folder-chip active"
                          : "project-image-folder-chip"
                      }
                      onClick={() => {
                        setSelectedProjectImageFolderId(folder.id);
                        setOpenImageFolderMenuId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedProjectImageFolderId(folder.id);
                          setOpenImageFolderMenuId(null);
                        }
                      }}
                      onDragOver={(event) => {
                        if (!isAdminProjectManager) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        if (!isAdminProjectManager) return;
                        event.preventDefault();
                        moveTemplateImagesToImageFolder(imageDragIdsFromEvent(event), folder.id);
                      }}
                    >
                      <span>{folder.name}</span>
                      <strong>{imageCount}</strong>
                      {isAdminProjectManager ? (
                        <span className="project-image-folder-menu-wrap">
                          <button
                            type="button"
                            className="project-image-folder-menu-btn"
                            title="Tùy chọn folder"
                            aria-label="Tùy chọn folder ảnh"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenImageFolderMenuId((current) =>
                                current === folder.id ? null : folder.id
                              );
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openImageFolderMenuId === folder.id ? (
                            <span className="project-image-folder-menu">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  renameImageFolder(folder.id);
                                }}
                              >
                                <Pencil size={15} />
                                Sửa tên
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteImageFolder(folder.id);
                                }}
                              >
                                <Trash2 size={15} />
                                Xóa
                              </button>
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ) : null}
            {showProjectFoldersSection ? (
              <section className="project-section">
                <div
                  className={
                    isAdminProjectManager
                      ? "project-section-heading project-folder-heading admin-folder-heading"
                      : "project-section-heading project-folder-heading"
                  }
                >
                  {isAdminProjectManager ? (
                    <div className="project-admin-folder-title-row">
                      <h2>Dự án</h2>
                      <button
                        type="button"
                        className="project-secondary-btn"
                        onClick={() => createTemplateFolder(activeProjectFolder?.id || null)}
                      >
                        <FolderPlus size={17} />
                        Tạo dự án mới
                      </button>
                    </div>
                  ) : (
                    <div className="project-section-title-row">
                      <button
                        type="button"
                        className="project-section-title compact"
                        aria-expanded={!isFoldersCollapsed}
                        onClick={() => setIsFoldersCollapsed((current) => !current)}
                      >
                        {isFoldersCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                        <h2>Dự án</h2>
                      </button>
                    </div>
                  )}
                  {!isAdminProjectManager && showAllProjectFoldersButton ? (
                    <button
                      type="button"
                      className="project-see-all-btn"
                      onClick={() => {
                        setBrowserPath(getProjectFolderListingPath(projectRouteAdmin));
                        setProjectListingMode("folders");
                        setProjectDesignPage(1);
                        setIsFoldersCollapsed(false);
                      }}
                    >
                      Xem tất cả
                    </button>
                  ) : null}
                </div>
                {!isFoldersCollapsed ? (
                  <div className="project-folder-cards">
                    {displayedProjectFolders.map((folder) => {
                      const childCount = appState.templateFolders.filter(
                        (candidate) => candidate.parentId === folder.id
                      ).length;
                      const designCount = visibleTemplates.filter(
                        (candidate) => candidate.folderId === folder.id
                      ).length;
                      const imageCount = appState.templateImages.filter(
                        (candidate) => candidate.folderId === folder.id
                      ).length;
                      return (
                        <article
                          key={folder.id}
                          className="project-folder-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            openProjectFolder(folder.id, "designs");
                            setSelectedTemplateFolderId(folder.id);
                            setIsDesignsCollapsed(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openProjectFolder(folder.id, "designs");
                              setSelectedTemplateFolderId(folder.id);
                              setIsDesignsCollapsed(false);
                            }
                          }}
                        >
                          <ProjectFolderIcon size="lg" />
                          <div>
                            {isAdminProjectManager && editingTemplateFolderId === folder.id ? (
                              <input
                                autoFocus
                                value={folder.name}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                  if (event.key === "Enter") event.currentTarget.blur();
                                  if (event.key === "Escape") setEditingTemplateFolderId(null);
                                }}
                                onChange={(event) => renameTemplateFolder(folder.id, event.target.value)}
                                onBlur={(event) => finishRenameTemplateFolder(folder.id, event.target.value)}
                              />
                            ) : (
                              <strong>{folder.name}</strong>
                            )}
                            <span>
                              {childCount + designCount + imageCount} mục
                            </span>
                          </div>
                          {isAdminProjectManager ? (
                            <div className="project-folder-card-actions">
                              <button
                                type="button"
                                title="Tùy chọn"
                                aria-label="Tùy chọn dự án"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenTemplateFolderMenuId((current) =>
                                    current === folder.id ? null : folder.id
                                  );
                                }}
                              >
                                <MoreHorizontal size={17} />
                              </button>
                              {openTemplateFolderMenuId === folder.id ? (
                                <div className="project-folder-action-menu">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setEditingTemplateFolderId(folder.id);
                                      setOpenTemplateFolderMenuId(null);
                                    }}
                                  >
                                    <Pencil size={15} />
                                    Sửa tên
                                  </button>
                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenTemplateFolderMenuId(null);
                                      deleteTemplateFolder(folder.id);
                                    }}
                                  >
                                    <Trash2 size={15} />
                                    Xóa
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            ) : null}

            {showProjectDesignsSection ? (
              <section className="project-section">
                {!activeProjectFolder && !isClientProjectLibrary ? (
                  <div className="project-section-heading">
                    <button
                      type="button"
                      className="project-section-title compact"
                      aria-expanded={!isDesignsCollapsed}
                      onClick={() => setIsDesignsCollapsed((current) => !current)}
                    >
                      {isDesignsCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                      <h2>Thiết kế</h2>
                    </button>
                    {showAllProjectDesignsButton ? (
                      <button
                        type="button"
                        className="project-see-all-btn"
                        onClick={() => {
                          setBrowserPath(getProjectDesignListingPath(projectRouteAdmin));
                          setProjectListingMode("designs");
                          setProjectDesignPage(1);
                          setIsDesignsCollapsed(false);
                        }}
                      >
                        Xem tất cả
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {(activeProjectFolder || !isDesignsCollapsed) && displayedManagementItems.length ? (
                  <>
                    <div className={projectDesignListClass}>
                      {displayedManagementItems.map((item) => (
                        <article
                          key={`${item.kind}-${item.id}`}
                          className={[
                            "project-design-card",
                            canSelectProjectImages && item.kind === "template" ? "selectable" : "",
                            selectedTemplateIds.includes(item.id) ? "selected" : ""
                          ].filter(Boolean).join(" ")}
                          role="button"
                          tabIndex={0}
                          aria-pressed={
                            canSelectProjectImages && item.kind === "template"
                              ? selectedTemplateIds.includes(item.id)
                              : undefined
                          }
                          draggable={canSelectProjectImages && item.kind === "template"}
                          onDragStart={(event) => {
                            if (!canSelectProjectImages || item.kind !== "template") return;
                            const dragIds = selectedProjectImageIds.includes(item.id)
                              ? selectedProjectImageIds
                              : [item.id];
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("application/x-template-image-id", item.id);
                            event.dataTransfer.setData("application/x-template-image-ids", JSON.stringify(dragIds));
                            event.dataTransfer.setData("text/plain", item.name);
                          }}
                          onClick={() => {
                            if (canSelectProjectImages && item.kind === "template") {
                              toggleTemplateSelection(item.id);
                              return;
                            }
                            openProjectItem(item);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              if (canSelectProjectImages && item.kind === "template") {
                                toggleTemplateSelection(item.id);
                                return;
                              }
                              openProjectItem(item);
                            }
                          }}
                        >
                          <button
                            type="button"
                            className={item.kind === "design" || item.image ? "project-design-thumb" : "project-design-thumb blank"}
                            tabIndex={-1}
                          >
                            {item.kind === "design" ? (
                              <ProjectDesignThumbnail template={item.template} />
                            ) : item.image ? (
                              <img
                                src={getPreviewImageSrc(item.image)}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span />
                            )}
                          </button>
                          {canSelectProjectImages && item.kind === "template" ? (
                            <label className="project-image-select" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedTemplateIds.includes(item.id)}
                                onChange={() => toggleTemplateSelection(item.id)}
                                aria-label={`Chọn ${item.name}`}
                              />
                              <span />
                            </label>
                          ) : null}
                          <div className="project-design-meta">
                            {!isAdminProjectManager ? (
                              <strong>{item.kind === "design" ? localizeProjectName(item.name) : item.name}</strong>
                            ) : item.kind === "design" ? (
                              <input
                                value={localizeProjectName(item.name)}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                                onChange={(event) => renameTemplate(item.id, event.target.value)}
                                onBlur={(event) => {
                                  if (!event.target.value.trim()) renameTemplate(item.id, "Trang");
                                }}
                                title="Đổi tên thiết kế"
                              />
                            ) : (
                              <input
                                value={item.name}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => event.stopPropagation()}
                                onChange={(event) => renameTemplateImage(item.id, event.target.value)}
                                onBlur={(event) => {
                                  if (!event.target.value.trim()) renameTemplateImage(item.id, "Ảnh chưa đặt tên");
                                }}
                                title="Đổi tên mẫu"
                              />
                            )}
                            {isAdminProjectManager && !activeProjectFolder && item.kind === "design" ? (
                              <button
                                type="button"
                                className="project-card-folder-link"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openProjectFolder(item.folderId, "designs");
                                }}
                              >
                                {item.folderName}
                              </button>
                            ) : null}
                            <span>
                              {item.width} x {item.height} · {formatProjectTime(item.updatedAt)}
                            </span>
                          </div>
                          {isAdminProjectManager ? (
                            <div className="project-card-actions">
                              {item.kind === "design" ? (
                                <button
                                  type="button"
                                  title="Nhân bản"
                                  aria-label="Nhân bản thiết kế"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    duplicateTemplate(item.id);
                                  }}
                                >
                                  <Copy size={17} />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                title="Xóa"
                                aria-label="Xóa"
                                disabled={item.kind === "design" && appState.templates.length <= 1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (item.kind === "design") {
                                    if (window.confirm(`Xóa thiết kế "${localizeProjectName(item.name)}"?`)) deletePage(item.id);
                                    return;
                                  }
                                  if (window.confirm(`Xóa mẫu "${item.name}"?`)) {
                                    deleteTemplateImage(item.id);
                                  }
                                }}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    {showProjectDesignPagination ? (
                      <nav className="project-pagination" aria-label="Phân trang thiết kế">
                        <button
                          type="button"
                          disabled={currentProjectDesignPage <= 1}
                          onClick={() => setProjectDesignPage((current) => Math.max(1, current - 1))}
                        >
                          Trước
                        </button>
                        <span>
                          Trang {currentProjectDesignPage} / {projectFolderDetailPageCount}
                        </span>
                        <button
                          type="button"
                          disabled={currentProjectDesignPage >= projectFolderDetailPageCount}
                          onClick={() =>
                            setProjectDesignPage((current) =>
                              Math.min(projectFolderDetailPageCount, current + 1)
                            )
                          }
                        >
                          Sau
                        </button>
                      </nav>
                    ) : null}
                  </>
                ) : !isDesignsCollapsed ? (
                  projectFolderDetailTab === "images" ? (
                    <div className="project-empty-state images-only">
                      <ImageUp size={34} />
                      <strong>Kéo ảnh vào đây hoặc dán ảnh từ clipboard</strong>
                      <span>Có thể chọn nhiều ảnh từ máy, kéo thả nhiều ảnh hoặc copy ảnh rồi paste vào trang.</span>
                    </div>
                  ) : (
                    <div className="project-empty-state">
                      <FolderPlus size={34} />
                      <strong>Dự án này chưa có thiết kế</strong>
                      <span>Tạo thiết kế mới trong dự án này để bắt đầu.</span>
                    </div>
                  )
                ) : null}
            </section>
            ) : null}
              </>
            )}
          </section>
        </main>

        {selectedProjectImageCount ? (
          <button
            type="button"
            className="project-floating-delete"
            onClick={deleteSelectedProjectImages}
          >
            <Trash2 size={18} />
            Xóa {selectedProjectImageCount} ảnh đã chọn
          </button>
        ) : null}

        {pendingProjectImageDeleteIds.length ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal confirm-modal">
              <div className="modal-head">
                <div className="modal-icon danger-icon">
                  <Trash2 size={22} />
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Đóng"
                  onClick={() => setPendingProjectImageDeleteIds([])}
                >
                  <X size={18} />
                </button>
              </div>
              <h2>Xóa ảnh đã chọn?</h2>
              <p className="confirm-copy">
                {pendingProjectImageDeleteIds.length} ảnh sẽ bị xóa khỏi dự án và không thể khôi phục lại được.
              </p>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPendingProjectImageDeleteIds([])}
                >
                  Hủy
                </button>
                <button type="button" className="btn danger" onClick={confirmDeleteSelectedProjectImages}>
                  Xóa ảnh
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {adminSettingsDialog}

        {previewTemplate ? (
          <div className="modal-backdrop preview-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal template-preview-modal">
              <div className="modal-head">
                <div>
                  <h2>{previewTemplate.name}</h2>
                  <p className="template-preview-meta">
                    {previewTemplate.width} x {previewTemplate.height}px
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Đóng"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="template-preview-frame">
                {getTemplateLibraryImage(previewTemplate) ? (
                  <img
                    src={getTemplateLibraryImage(previewTemplate)}
                    alt={previewTemplate.name}
                    decoding="async"
                  />
                ) : (
                  <div className="blank-preview-placeholder">Chưa có ảnh</div>
                )}
              </div>
              <div className="template-preview-actions">
                <button type="button" className="btn" onClick={() => setPreviewTemplate(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pendingTemplateUploads.length ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="admin-modal project-upload-modal">
              <div className="modal-head">
                <div>
                  <h2>Tải ảnh lên</h2>
                  <p className="template-preview-meta">
                    {pendingTemplateUploadSaveCount} ảnh chờ lưu
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Đóng"
                  disabled={isUploadingAsset}
                  onClick={() => setPendingTemplateUploads([])}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="project-upload-modal-list">
                {pendingTemplateUploads.map((upload) => (
                  <div key={upload.id} className={`project-upload-modal-item ${upload.status}`}>
                    <img src={upload.dataUrl} alt="" />
                    <label>
                      Tên ảnh
                      <input
                        value={upload.name}
                        disabled={upload.status === "uploading" || upload.status === "saved"}
                        onChange={(event) =>
                          updatePendingTemplateUpload(upload.id, { name: event.target.value })
                        }
                      />
                    </label>
                    {upload.status === "uploading" || upload.status === "error" ? (
                      <span>
                        {upload.status === "uploading"
                          ? "Đang tải lên"
                          : upload.error || "Lỗi tải ảnh"}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              {templateLibraryError ? <div className="project-upload-modal-message">{templateLibraryError}</div> : null}
              <div className="template-preview-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={isUploadingAsset}
                  onClick={() => setPendingTemplateUploads([])}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn blue"
                  disabled={isUploadingAsset || !pendingTemplateUploadSaveCount}
                  onClick={savePendingTemplateUpload}
                >
                  {isUploadingAsset ? "Đang tải..." : "Lưu tất cả"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pendingDesignFolderId ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <form className="admin-modal create-design-modal" onSubmit={submitCreateDesign}>
              <div className="modal-head">
                <div>
                  <h2>Tạo thiết kế mới</h2>
                  <p className="template-preview-meta">Nhập tên thiết kế trước khi tạo file.</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Đóng"
                  onClick={closeCreateDesignModal}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="new-design-name">Tên thiết kế</label>
                <input
                  id="new-design-name"
                  autoFocus
                  value={newDesignName}
                  onChange={(event) => setNewDesignName(event.target.value)}
                  placeholder="Ví dụ: Mẫu căn 2PN"
                />
              </div>
              <div className="template-preview-actions">
                <button type="button" className="btn" onClick={closeCreateDesignModal}>
                  Hủy
                </button>
                <button type="submit" className="btn blue">
                  Tạo thiết kế
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="side-nav canva-rail">
        <button
          type="button"
          className={activeDesignPanel === "elements" ? "rail-tab active" : "rail-tab"}
          title="Thành phần"
          aria-pressed={activeDesignPanel === "elements"}
          onClick={() => setActiveDesignPanel("elements")}
        >
          <Shapes size={24} />
          <span>Thành phần</span>
        </button>
        <button
          type="button"
          className={activeDesignPanel === "images" ? "rail-tab active" : "rail-tab"}
          title="Ảnh"
          aria-pressed={activeDesignPanel === "images"}
          onClick={() => setActiveDesignPanel("images")}
        >
          <ImageUp size={24} />
          <span>Ảnh</span>
        </button>

        {isAdminWorkspace ? (
          <div className="rail-admin" ref={settingsMenuRef}>
            <button
              type="button"
              className={showSettingsMenu ? "rail-icon-btn active" : "rail-icon-btn"}
              title="Settings"
              aria-expanded={showSettingsMenu}
              onClick={() => setShowSettingsMenu((current) => !current)}
            >
              <Settings size={20} />
            </button>
            {showSettingsMenu ? (
              <div className="rail-popover" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDesignPanel("images");
                    setShowSettingsMenu(false);
                  }}
                >
                  <ImageUp size={16} />
                  Ảnh
                </button>
                <button type="button" onClick={openFontLibraryModal}>
                  <Type size={16} />
                  Fonts
                </button>
                <button type="button" onClick={openAccountManager}>
                  <Users size={16} />
                  Quản lý tài khoản
                </button>
                <button type="button" onClick={openAdminSettings}>
                  <BadgeCheck size={16} />
                  Account
                </button>
                <button type="button" onClick={logoutAdmin}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>

      <main className="main-panel">
        <header className="admin-header canva-topbar">
          <div className="topbar-left">
            {isAdminWorkspace ? (
              <button
                type="button"
                className="topbar-folder-back-btn"
                title="Quay lại dự án của thiết kế"
                aria-label="Quay lại dự án của thiết kế"
                onClick={openCurrentTemplateFolder}
              >
                <ArrowLeft size={17} />
                <span>Quay lại dự án</span>
              </button>
            ) : (
              <button
                type="button"
                className="topbar-logo-btn"
                title="Về trang quản lý"
                aria-label="Về trang quản lý"
                onClick={openTemplateLibraryModal}
              >
                <img src={EDITOR_LOGO_URL} alt="OneHousing" className="topbar-logo" />
              </button>
            )}
          </div>
          <div className="topbar-title-wrap" ref={pageSizeMenuRef}>
            <button
              type="button"
              className={`${showPageSizeMenu ? "topbar-title active" : "topbar-title"} ${
                isAdminWorkspace ? "" : "readonly"
              }`}
              aria-expanded={isAdminWorkspace ? showPageSizeMenu : undefined}
              aria-disabled={!isAdminWorkspace}
              title={isAdminWorkspace ? "Chỉnh thông tin trang" : "Chỉ admin được chỉnh sửa"}
              onClick={openPageSizeMenu}
            >
              {template.name} - {template.width} x {template.height} px
            </button>
            {showPageSizeMenu && isAdminWorkspace ? (
              <form
                className="page-size-popover"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyPageSizeDraft();
                }}
              >
                <div className="page-size-popover-title">
                  {isAdminWorkspace ? "Thông tin trang" : "Kích thước trang"}
                </div>
                {isAdminWorkspace ? (
                  <label className="page-name-field">
                    <span>Tên trang</span>
                    <input
                      autoFocus
                      value={pageSizeDraft.name}
                      onChange={(event) =>
                        setPageSizeDraft((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                      placeholder="Nhập tên trang"
                    />
                  </label>
                ) : null}
                <div className="page-size-grid">
                  <label>
                    <span>W</span>
                    <input
                      autoFocus={!isAdminWorkspace}
                      type="number"
                      min={64}
                      max={10000}
                      value={pageSizeDraft.width}
                      onChange={(event) =>
                        setPageSizeDraft((current) => ({
                          ...current,
                          width: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>H</span>
                    <input
                      type="number"
                      min={64}
                      max={10000}
                      value={pageSizeDraft.height}
                      onChange={(event) =>
                        setPageSizeDraft((current) => ({
                          ...current,
                          height: event.target.value
                        }))
                      }
                    />
                  </label>
                </div>
                <button type="submit" className="page-size-apply-btn">
                  Áp dụng
                </button>
              </form>
            ) : null}
          </div>
          <div className="topbar-right">
            <div className={`cloud-sync-status ${cloudSync.status}`}>
              {cloudSync.status === "saving" || cloudSync.status === "loading" ? (
                <LoaderCircle className="cloud-sync-icon" size={16} />
              ) : cloudSync.status === "error" ? (
                <AlertCircle className="cloud-sync-icon" size={16} />
              ) : (
                <CheckCircle2 className="cloud-sync-icon" size={16} />
              )}
              {cloudSync.message}
            </div>
            <div className="topbar-download-wrap" ref={downloadMenuRef}>
              <button
                type="button"
                className={showDownloadMenu ? "topbar-download-btn active" : "topbar-download-btn"}
                disabled={isExporting}
                aria-expanded={showDownloadMenu}
                onClick={() => setShowDownloadMenu((current) => !current)}
              >
                <Download size={17} />
                Tải xuống
              </button>
              {showDownloadMenu ? (
                <div className="download-menu" role="dialog" aria-label="Tải ảnh">
                  <div className="download-menu-title">Tải ảnh</div>
                  <div className="download-menu-grid">
                    <div className="form-group">
                      <label>Loại file</label>
                      <CustomSelect
                        value={exportMimeType}
                        options={[
                          { value: "image/png", label: "PNG" },
                          { value: "image/jpeg", label: "JPG" }
                        ]}
                        onChange={(nextValue) =>
                          setExportMimeType(nextValue as "image/png" | "image/jpeg")
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Kích cỡ</label>
                      <CustomSelect
                        value={exportScale}
                        options={[
                          { value: "1", label: "1x" },
                          { value: "0.75", label: "0.75x" },
                          { value: "0.5", label: "0.5x" }
                        ]}
                        onChange={(nextValue) =>
                          setExportScale(nextValue as "1" | "0.5" | "0.75")
                        }
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="download-menu-btn"
                    disabled={isExporting}
                    onClick={downloadFromTopbar}
                  >
                    <Download size={18} />
                    Tải xuống
                  </button>
                </div>
              ) : null}
            </div>
            {isAdminWorkspace ? (
              <button
                type="button"
                className="topbar-template-save-btn"
                onClick={saveTemplateForClient}
              >
                <Save size={17} />
                Lưu template
              </button>
            ) : null}
          </div>
        </header>

        {downloadToast ? (
          <div className="download-toast" role="status" aria-live="polite">
            <Download size={17} />
            {downloadToast}
          </div>
        ) : null}

        {storageWarning ? <div className="storage-warning">{storageWarning}</div> : null}

        <section className="workspace-grid">
          <section className="left-panel panel design-panel">
            {activeDesignPanel === "elements" ? (
              <>
                <div className="section-label">Duyệt danh mục</div>
                <div className="element-category-grid">
                  <button type="button" className="element-card" onClick={() => addShapeLayer("frame")}>
                    <div className="element-preview frame-preview">
                      <div />
                    </div>
                    <span>Khung</span>
                  </button>
                  <button type="button" className="element-card" onClick={() => addShapeLayer("rect")}>
                    <div className="element-preview shape-preview square-preview">
                      <Square size={34} />
                    </div>
                    <span>Hình khối</span>
                  </button>
                  <button
                    type="button"
                    className="element-card"
                    onClick={() => setActiveDesignPanel("effects")}
                  >
                    <div className="element-preview shape-preview effect-preview">
                      <Sparkles size={31} />
                    </div>
                    <span>{"Hiệu ứng"}</span>
                  </button>
                  <button type="button" className="element-card" onClick={() => addShapeLayer("circle")}>
                    <div className="element-preview shape-preview circle-preview">
                      <Circle size={38} />
                    </div>
                    <span>Hình tròn</span>
                  </button>
                </div>

                {isAdminWorkspace ? (
                  <>
                    <div className="design-section-divider" />

                    <div className="form-group">
                      <label>Ảnh nền</label>
                      {template.backgroundDataUrl ? (
                        <div className="selected-template-preview">
                          <img
                            src={getPreviewImageSrc(template.backgroundDataUrl)}
                            alt={template.name}
                            loading="lazy"
                            decoding="async"
                          />
                          <button
                            type="button"
                            className="selected-template-delete"
                            title="Xóa ảnh hiện tại"
                            aria-label="Xóa ảnh hiện tại"
                            onClick={removeCurrentTemplateImage}
                          >
                            <X size={15} />
                          </button>
                          <button
                            type="button"
                            className="selected-template-change"
                            onClick={openTemplatePickerModal}
                          >
                            Đổi ảnh
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="btn full" onClick={openTemplatePickerModal}>
                          <ImageUp size={18} />
                          Thêm ảnh
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </>
            ) : activeDesignPanel === "effects" ? (
              <>
                <div className="panel-head compact effect-panel-head">
                  <button
                    type="button"
                    className="effect-back-btn"
                    title={"Quay lại Thành phần"}
                    onClick={() => setActiveDesignPanel("elements")}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2>{"Hiệu ứng"}</h2>
                    <p>{"Dùng chung cho tất cả thiết kế"}</p>
                  </div>
                  {isAdminWorkspace ? (
                    <label className={isUploadingAsset ? "effect-upload-btn disabled" : "effect-upload-btn"}>
                      <ImageUp size={17} />
                      <span>{"Tải lên"}</span>
                      <input
                        type="file"
                        accept="image/png,image/webp"
                        multiple
                        disabled={isUploadingAsset}
                        onChange={(event) => {
                          void uploadEffectAssets(Array.from(event.target.files || []));
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                {appState.effectAssets.length ? (
                  <div className="effect-library-grid effect-panel-grid">
                    {appState.effectAssets.map((effect) => (
                      <div key={effect.id} className="effect-library-item">
                        <button
                          type="button"
                          className="effect-library-card"
                          title={effect.name}
                          onClick={() => addEffectToCanvas(effect)}
                        >
                          <img src={getPreviewImageSrc(effect.dataUrl, 180)} alt={effect.name} loading="lazy" />
                          <span>{effect.name}</span>
                        </button>
                        {isAdminWorkspace ? (
                          <button
                            type="button"
                            className="effect-library-delete"
                            title={"Xóa hiệu ứng khỏi thư viện"}
                            onClick={() => deleteEffectAsset(effect.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="effect-library-empty">{"Chưa có hiệu ứng. Tải PNG hoặc WebP nền trong suốt để dùng chung."}</div>
                )}
              </>
            ) : activeDesignPanel === "images" ? (
              <>
                <div className="panel-head compact">
                  <div>
                    <h2>Ảnh</h2>
                    <p>Bấm ảnh để đặt vào khung</p>
                  </div>
                  {isAdminWorkspace ? (
                    <label
                      className={
                        isUploadingAsset
                          ? "image-panel-upload-icon disabled"
                          : "image-panel-upload-icon"
                      }
                      title={isUploadingAsset ? "Đang tải ảnh..." : "Tải ảnh lên"}
                      aria-label={isUploadingAsset ? "Đang tải ảnh..." : "Tải ảnh lên"}
                    >
                      <ImageUp size={20} />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingAsset}
                        onChange={(event) => {
                          uploadImagesToCurrentTemplateFolder(Array.from(event.target.files || []));
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <ImageUp size={20} />
                  )}
                </div>

                {false && !isAdminWorkspace ? (
                  <div className="form-group">
                    <label>Dự án</label>
                    <CustomSelect
                      value={activeImageFolderId}
                      options={flattenedTemplateFolders.map((folder) => ({
                        value: folder.id,
                        label: `${folder.depth ? "  ".repeat(folder.depth) : ""}${folder.name}`
                      }))}
                      onChange={setSelectedImageFolderId}
                    />
                  </div>
                ) : null}

                <div className="image-panel-tools">
                  <label className="image-panel-search">
                    <Search size={17} />
                    <input
                      value={imageSearch}
                      onChange={(event) => setImageSearch(event.target.value)}
                      placeholder="Tìm kiếm ảnh"
                    />
                    {imageSearch ? (
                      <button
                        type="button"
                        className="image-panel-clear"
                        title="Xóa tìm kiếm"
                        aria-label="Xóa tìm kiếm"
                        onClick={() => setImageSearch("")}
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                  </label>
                  {isAdminWorkspace ? (
                    <label
                      className={
                        isUploadingAsset
                          ? "image-panel-upload-icon disabled"
                          : "image-panel-upload-icon"
                      }
                      title={isUploadingAsset ? "Đang tải ảnh..." : "Tải ảnh lên"}
                      aria-label={isUploadingAsset ? "Đang tải ảnh..." : "Tải ảnh lên"}
                    >
                      <ImageUp size={20} />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingAsset}
                        onChange={(event) => {
                          uploadImagesToCurrentTemplateFolder(Array.from(event.target.files || []));
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    className="image-panel-sort"
                    title={imageSortOrder === "newest" ? "Sắp xếp cũ nhất" : "Sắp xếp mới nhất"}
                    aria-label={imageSortOrder === "newest" ? "Sắp xếp cũ nhất" : "Sắp xếp mới nhất"}
                    onClick={() =>
                      setImageSortOrder((current) => (current === "newest" ? "oldest" : "newest"))
                    }
                  >
                    <span key={imageSortOrder} className="project-tool-icon-motion">
                      {imageSortOrder === "newest" ? <ArrowUpDown size={20} /> : <ArrowDownUp size={20} />}
                    </span>
                  </button>
                </div>

                {(panelImageFolders.length || isAdminWorkspace) ? (
                  <div className="image-panel-folder-list" aria-label="Folder ảnh">
                    <button
                      type="button"
                      className={
                        activePanelImageFolderId
                          ? "image-panel-folder-chip"
                          : "image-panel-folder-chip active"
                      }
                      onClick={() => setSelectedPanelImageFolderId("")}
                    >
                      <span>Tất cả</span>
                    </button>
                    {panelImageFolders.map((folder) => (
                      <button
                        type="button"
                        key={folder.id}
                        className={
                          activePanelImageFolderId === folder.id
                            ? "image-panel-folder-chip active"
                            : "image-panel-folder-chip"
                        }
                        onClick={() => setSelectedPanelImageFolderId(folder.id)}
                      >
                        <span>{folder.name}</span>
                      </button>
                    ))}
                    {isAdminWorkspace ? (
                      <button
                        type="button"
                        className="image-panel-folder-chip create"
                        onClick={() => createImageFolder(imagePanelFolderId)}
                      >
                        <FolderPlus size={16} />
                        <span>Tạo folder</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {visiblePanelImages.length ? (
                  <div className="image-library-grid">
                    {visiblePanelImages.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className="image-library-card"
                        title={item.name}
                        draggable={canEditWorkspace}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "copy";
                          event.dataTransfer.setData("application/x-template-image-id", item.id);
                          event.dataTransfer.setData("text/plain", item.name);
                          setTemplateImageDragPreview(event, item);
                        }}
                        onClick={() => placeImageInFrame(item)}
                      >
                        <img
                          src={getPreviewImageSrc(getTemplateLibraryImage(item))}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                        />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="image-library-empty">
                    <ImageUp size={24} />
                    <span>Chưa có ảnh trong dự án này</span>
                  </div>
                )}

                {isAdminWorkspace ? (
                  <label className={isUploadingAsset ? "btn full image-manager-btn disabled" : "btn full image-manager-btn"}>
                    <ImageUp size={18} />
                    {isUploadingAsset ? "Đang tải ảnh..." : "Tải ảnh lên"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingAsset}
                      onChange={(event) => {
                        uploadImagesToCurrentTemplateFolder(Array.from(event.target.files || []));
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </>
            ) : (
              <>
                {!isAdminWorkspace ? (
                  <div className="panel-head compact">
                    <div>
                      <h2>Dữ liệu</h2>
                      <p>Chọn mã căn để tự động điền thông tin trên ảnh</p>
                    </div>
                    <FileSpreadsheet size={20} />
                  </div>
                ) : null}

                <div className="form-group">
                  <label>Bộ dữ liệu</label>
                  <CustomSelect
                    value={dataset.id}
                    placeholder="Chọn bộ dữ liệu"
                    options={appState.datasets.map((item) => ({
                      value: item.id,
                      label: item.name
                    }))}
                    onChange={(nextValue) => {
                      setAppState((current) => ({
                        ...current,
                        activeDatasetId: nextValue
                      }));
                      setSelectedRowIndex(0);
                    }}
                  />
                </div>

                {hasSelectedDataset ? (
                  <>
                    <div className="form-group">
                      <label>{isAdminWorkspace ? "Dòng xem trước" : "Mã căn"}</label>
                      <CustomSelect
                        value={String(selectedRowIndex)}
                        options={dataset.rows.map((row, index) => ({
                          value: String(index),
                          label: row[dataset.keyColumn] || `Dòng ${index + 1}`
                        }))}
                        onChange={(nextValue) => setSelectedRowIndex(Number(nextValue))}
                        searchable
                        searchPlaceholder={isAdminWorkspace ? "Tìm dòng" : "Tìm mã căn"}
                      />
                    </div>

                    {isAdminWorkspace ? (
                      <div className="column-section">
                        <div className="section-label">Chữ dữ liệu</div>
                        <div className="column-grid">
                          {dataset.columns.map((column) => (
                            <button
                              type="button"
                              key={column}
                              className="column-chip"
                              draggable={canEditWorkspace}
                              onDragStart={(event) =>
                                event.dataTransfer.setData("text/column", column)
                              }
                              onClick={() => addTextLayer(column)}
                              disabled={!canAddDataTextLayer}
                            >
                              <Plus size={14} />
                              {column}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </section>
          <section
            className={selectedLayer ? "canvas-panel has-property-toolbar" : "canvas-panel"}
            ref={canvasWrapRef}
          >
            {selectedLayer ? (
              <div className="canvas-toolbar canva-property-toolbar">
                <div className="selection-toolbar" aria-label="Selected layer properties">
                  {hasMultiSelection ? (
                  <>
                    <div className="toolbar-group-label">{selectedLayers.length} selected</div>
                    <div className="toolbar-segmented" aria-label="Horizontal group alignment">
                      <button
                        type="button"
                        disabled={!selectedLayersCanEdit}
                        onClick={() => alignSelectedLayers("horizontal", "start")}
                        title="Align left"
                      >
                        <AlignHorizontalJustifyStart size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={!selectedLayersCanEdit}
                        onClick={() => alignSelectedLayers("horizontal", "center")}
                        title="Align center"
                      >
                        <AlignHorizontalJustifyCenter size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={!selectedLayersCanEdit}
                        onClick={() => alignSelectedLayers("horizontal", "end")}
                        title="Align right"
                      >
                        <AlignHorizontalJustifyEnd size={16} />
                      </button>
                    </div>
                    <div className="toolbar-segmented" aria-label="Vertical group alignment">
                      <button
                        type="button"
                        disabled={!selectedLayersCanEdit}
                        onClick={() => alignSelectedLayers("vertical", "start")}
                        title="Align top"
                      >
                        <AlignVerticalJustifyStart size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={!selectedLayersCanEdit}
                        onClick={() => alignSelectedLayers("vertical", "center")}
                        title="Align middle"
                      >
                        <AlignVerticalJustifyCenter size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={!selectedLayersCanEdit}
                        onClick={() => alignSelectedLayers("vertical", "end")}
                        title="Align bottom"
                      >
                        <AlignVerticalJustifyEnd size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="toolbar-icon-btn"
                      disabled={!selectedLayersCanEdit || selectedLayers.length < 3}
                      onClick={() => distributeSelectedLayers("horizontal")}
                      title="Distribute horizontally"
                    >
                      <Columns3 size={17} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-icon-btn"
                      disabled={!selectedLayersCanEdit || selectedLayers.length < 3}
                      onClick={() => distributeSelectedLayers("vertical")}
                      title="Distribute vertically"
                    >
                      <Rows3 size={17} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-toggle"
                      disabled={!selectedLayersCanEdit}
                      onClick={tidySelectedLayers}
                      title="Tidy selection"
                    >
                      Tidy
                    </button>
                    <button
                      type="button"
                      className="toolbar-icon-btn"
                      title="Nhân bản"
                      disabled={!isAdminWorkspace || !selectedLayersCanEdit}
                      onClick={duplicateSelectedLayers}
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-icon-btn danger"
                      title="Delete selected elements"
                      disabled={!selectedLayersCanEdit}
                      onClick={removeSelectedLayer}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                  ) : selectedLayerIsShape ? (
                  <>
                    {!selectedLayerIsStandaloneImage ? (
                      <>
                        {selectedLayer.imageDataUrl ? (
                          <div className="toolbar-image-chip" title={selectedLayer.imageName || "Frame image"}>
                            <img src={selectedLayer.imageDataUrl} alt={selectedLayer.imageName || "Frame image"} />
                            <button
                              type="button"
                              title="Remove image from frame"
                              disabled={!selectedLayerCanUseShapeControls}
                              onClick={() =>
                                updateSelectedLayer({
                                  imageDataUrl: undefined,
                                  imageName: undefined,
                                  imageCropFocusX: undefined,
                                  imageCropFocusY: undefined,
                                  imageCropZoom: undefined,
                                  imageUsage: undefined
                                })
                              }
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : null}
                        <div className="toolbar-color-field compact-color-field" title="Fill">
                          <HexColorInput
                            value={selectedLayer.fill || "#8b3dff"}
                            disabled={!selectedLayerCanUseShapeControls}
                            onChange={(nextValue) => updateSelectedLayer({ fill: nextValue })}
                          />
                        </div>

                        <button
                          type="button"
                          className={selectedLayer.strokeWidth ? "toolbar-toggle active" : "toolbar-toggle"}
                          disabled={!selectedLayerCanUseShapeControls}
                          onClick={() =>
                            updateSelectedLayer({
                              stroke: selectedLayer.stroke || "#ffffff",
                              strokeWidth: selectedLayer.strokeWidth ? 0 : 4
                            })
                          }
                        >
                          {selectedLayer.strokeWidth ? "Stroke" : "Add stroke"}
                        </button>

                        {selectedLayer.strokeWidth ? (
                          <>
                            <div className="toolbar-color-field compact-color-field stroke-color-field" title="Stroke color">
                              <HexColorInput
                                value={selectedLayer.stroke || "#ffffff"}
                                disabled={!selectedLayerCanUseShapeControls}
                                onChange={(nextValue) => updateSelectedLayer({ stroke: nextValue })}
                              />
                            </div>
                            <label className="toolbar-number-field">
                              <span
                                className="toolbar-scrub-handle"
                                onPointerDown={(event) =>
                                  beginToolbarNumberScrub(event, {
                                    value: selectedLayer.strokeWidth || 1,
                                    min: 1,
                                    max: 40,
                                    enabled: selectedLayerCanUseShapeControls,
                                    onChange: (nextValue) => updateSelectedLayer({ strokeWidth: nextValue })
                                  })
                                }
                              >
                                Stroke
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={40}
                                value={selectedLayer.strokeWidth}
                                disabled={!selectedLayerCanUseShapeControls}
                                onChange={(event) => updateSelectedLayer({ strokeWidth: Number(event.target.value) })}
                              />
                            </label>
                          </>
                        ) : null}
                      </>
                    ) : null}

                    {selectedLayerIsStandaloneImage ? (
                      <button
                        type="button"
                        className="toolbar-icon-btn"
                        title="Reset về kích thước gốc"
                        disabled={!selectedLayerCanEdit || !selectedLayer.imageDataUrl}
                        onClick={resetSelectedImageToOriginalSize}
                      >
                        <Maximize2 size={16} />
                      </button>
                    ) : null}
                    <label className="toolbar-number-field">
                      <span
                        className="toolbar-scrub-handle"
                        onPointerDown={(event) =>
                          beginToolbarNumberScrub(event, {
                            value: selectedShapeWidth,
                            min: 24,
                            enabled: selectedLayerCanUseShapeControls,
                            onChange: (nextValue) => updateSelectedLayer({ width: nextValue })
                          })
                        }
                      >
                        W
                      </span>
                      <input
                        ref={shapeWidthInputRef}
                        type="number"
                        min={24}
                        value={selectedShapeWidth}
                        disabled={!selectedLayerCanUseShapeControls}
                        onChange={(event) => updateSelectedLayer({ width: Number(event.target.value) })}
                      />
                    </label>
                    <label className="toolbar-number-field">
                      <span
                        className="toolbar-scrub-handle"
                        onPointerDown={(event) =>
                          beginToolbarNumberScrub(event, {
                            value: selectedShapeHeight,
                            min: 24,
                            enabled: selectedLayerCanUseShapeControls,
                            onChange: (nextValue) => updateSelectedLayer({ height: nextValue })
                          })
                        }
                      >
                        H
                      </span>
                      <input
                        ref={shapeHeightInputRef}
                        type="number"
                        min={24}
                        value={selectedShapeHeight}
                        disabled={!selectedLayerCanUseShapeControls}
                        onChange={(event) => updateSelectedLayer({ height: Number(event.target.value) })}
                      />
                    </label>
                    <div className="corner-radius-control">
                      <div className="toolbar-number-field corner-radius-field">
                        <button
                          type="button"
                          className="toolbar-field-icon corner-radius-menu-btn"
                          title="Chỉnh từng góc"
                          aria-expanded={showCornerRadiusPopover}
                          disabled={!selectedLayerCanUseShapeControls || selectedLayer.shapeVariant === "circle"}
                          onClick={() => setShowCornerRadiusPopover((current) => !current)}
                        >
                          <SquareRoundCorner size={15} />
                        </button>
                        <input
                          ref={shapeRadiusInputRef}
                          type="number"
                          min={0}
                          max={CORNER_RADIUS_MAX}
                          placeholder={selectedShapeCornersAreUniform ? undefined : "Mix"}
                          value={selectedShapeCornersAreUniform ? selectedShapeRadius : ""}
                          disabled={!selectedLayerCanUseShapeControls || selectedLayer.shapeVariant === "circle"}
                          onChange={(event) => updateSelectedCornerRadiusForAll(Number(event.target.value))}
                        />
                      </div>
                      {showCornerRadiusPopover && selectedLayer.shapeVariant !== "circle" ? (
                        <div className="corner-radius-popover" role="dialog" aria-label="Chỉnh từng góc">
                          <div className="corner-radius-popover-title">Từng góc</div>
                          <div className="corner-radius-grid">
                            {CORNER_RADIUS_KEYS.map((corner) => (
                              <label key={corner.key} className={`corner-radius-item ${corner.key}`}>
                                <span
                                  className="corner-radius-corner-icon"
                                  title={corner.title}
                                  aria-label={corner.title}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={CORNER_RADIUS_MAX}
                                  value={selectedShapeCornerRadii[corner.key]}
                                  disabled={!selectedLayerCanUseShapeControls}
                                  onChange={(event) =>
                                    updateSelectedCornerRadiusCorner(corner.key, Number(event.target.value))
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {selectedLayerIsStandaloneImage ? (
                      <label className="toolbar-number-field opacity-field">
                        <span
                          className="toolbar-scrub-handle"
                          onPointerDown={(event) =>
                            beginToolbarNumberScrub(event, {
                              value: Math.round((selectedLayer.opacity ?? 1) * 100),
                              min: 0,
                              max: 100,
                              onChange: (nextValue) => updateSelectedLayer({ opacity: nextValue / 100 })
                            })
                          }
                        >
                          Opacity
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                          disabled={!selectedLayerCanEdit}
                          onChange={(event) =>
                            updateSelectedLayer({
                              opacity: Math.min(1, Math.max(0, Number(event.target.value) / 100))
                            })
                          }
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="toolbar-icon-btn"
                      title="Nhân bản"
                      disabled={!isAdminWorkspace || !selectedLayersCanEdit}
                      onClick={duplicateSelectedLayers}
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-icon-btn danger"
                      title="Delete element"
                      disabled={!selectedLayerCanEdit}
                      onClick={removeSelectedLayer}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                  ) : (
                  <>
                    <div className="toolbar-select font-select">
                      <CustomSelect
                        value={selectedLayer.fontFamily}
                        disabled={!selectedLayerCanEdit}
                        options={availableFonts.map((font) => ({ value: font, label: font }))}
                        onChange={(nextValue) => {
                          const matchingStyles = appState.customFonts.filter(
                            (font) => font.family === nextValue
                          );
                          const nextStyle =
                            matchingStyles.find(
                              (font) =>
                                (font.fontWeight || "400") === selectedLayer.fontWeight &&
                                (font.fontStyle || "normal") === (selectedLayer.fontStyle || "normal")
                            ) || matchingStyles[0];
                          updateSelectedLayer(
                            nextStyle
                              ? {
                                  fontFamily: nextValue,
                                  fontWeight: clampFontWeight(nextStyle.fontWeight),
                                  fontStyle: nextStyle.fontStyle || "normal"
                                }
                              : { fontFamily: nextValue }
                          );
                        }}
                      />
                    </div>
                    <div className="toolbar-select style-select">
                      <CustomSelect
                        value={selectedFontStyleValue}
                        disabled={!selectedLayerCanEdit}
                        options={selectedFontStyleOptions}
                        onChange={(nextValue) => {
                          const [fontWeight, nextStyle = "normal"] = nextValue.split("|");
                          updateSelectedLayer({
                            fontWeight,
                            fontStyle: nextStyle === "italic" ? "italic" : "normal"
                          });
                        }}
                      />
                    </div>
                    <label className="toolbar-number-field compact">
                      <span
                        className="toolbar-field-icon toolbar-scrub-handle"
                        title="Font size"
                        onPointerDown={(event) =>
                          beginToolbarNumberScrub(event, {
                            value: selectedLayer.fontSize,
                            min: 8,
                            max: 220,
                            onChange: (nextValue) => updateSelectedLayer({ fontSize: nextValue })
                          })
                        }
                      >
                        <Type size={15} />
                      </span>
                      <input
                        type="number"
                        min={8}
                        max={220}
                        value={selectedLayer.fontSize}
                        disabled={!selectedLayerCanEdit}
                        onChange={(event) => updateSelectedLayer({ fontSize: Number(event.target.value) })}
                      />
                    </label>
                    <div className="toolbar-color-field" title="Text color">
                      <HexColorInput
                        value={selectedLayer.color}
                        disabled={!selectedLayerCanEdit}
                        onChange={(nextValue) => updateSelectedLayer({ color: nextValue })}
                      />
                    </div>
                    <div className="toolbar-segmented">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          type="button"
                          key={align}
                          className={selectedLayer.align === align ? "active" : ""}
                          disabled={!selectedLayerCanEdit}
                          onClick={() => updateSelectedLayer({ align })}
                          title={align}
                        >
                          {align === "left" ? <AlignLeft size={16} /> : align === "center" ? <AlignCenter size={16} /> : <AlignRight size={16} />}
                        </button>
                      ))}
                    </div>
                    <label className="toolbar-number-field">
                      <span
                        className="toolbar-scrub-handle"
                        onPointerDown={(event) =>
                          beginToolbarNumberScrub(event, {
                            value: Math.round(selectedLayer.width),
                            min: 80,
                            onChange: (nextValue) => updateSelectedLayer({ width: nextValue })
                          })
                        }
                      >
                        W
                      </span>
                      <input
                        type="number"
                        min={80}
                        value={Math.round(selectedLayer.width)}
                        disabled={!selectedLayerCanEdit}
                        onChange={(event) => updateSelectedLayer({ width: Number(event.target.value) })}
                      />
                    </label>
                    <button
                      type="button"
                      className="toolbar-icon-btn"
                      title="Nhân bản"
                      disabled={!isAdminWorkspace || !selectedLayersCanEdit}
                      onClick={duplicateSelectedLayers}
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      type="button"
                      className="toolbar-icon-btn danger"
                      title="Delete layer"
                      disabled={!selectedLayerCanEdit}
                      onClick={removeSelectedLayer}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                  )}
                </div>
              </div>
            ) : null}

            <div
              ref={canvasShellRef}
              className={`canvas-shell ${activeCanvasTool}-tool${isCanvasPanning ? " panning" : ""}${zoomLevel > 1 ? " zoomed" : ""}`}
              onWheel={handleCanvasWheel}
              onPointerDown={beginCanvasPan}
              onPointerUp={clearCanvasSelectionFromBlankArea}
              onPointerMove={updateCanvasPan}
              onPointerUpCapture={finishCanvasPan}
              onPointerCancel={finishCanvasPan}
              onPointerLeave={finishCanvasPan}
              onAuxClick={(event) => {
                if (event.button === 1) event.preventDefault();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleCanvasDrop}
            >
              <div
                className="canvas-workspace"
                onPointerDown={beginWorkspaceSelection}
                onPointerMove={updateWorkspaceSelection}
                onPointerUp={finishWorkspaceSelection}
              >
                <div className="stage-stack">
                <div
                  className={template.backgroundDataUrl ? "stage-card" : "stage-card transparent"}
                  style={{
                    width: template.width * stageScale,
                    height: template.height * stageScale
                  }}
                >
                  <Stage
                    ref={stageRef}
                    width={template.width * stageScale + transformControlBleed}
                    height={template.height * stageScale + transformControlBleed}
                    scaleX={stageScale}
                    scaleY={stageScale}
                    style={{
                      width: template.width * stageScale + transformControlBleed,
                      height: template.height * stageScale + transformControlBleed
                    }}
                    onMouseDown={beginCanvasSelection}
                    onMouseMove={updateCanvasSelection}
                    onMouseUp={() => finishCanvasSelection()}
                    onTouchStart={beginCanvasSelection}
                    onTouchMove={updateCanvasSelection}
                    onTouchEnd={() => finishCanvasSelection()}
                  >
                  <Layer>
                    <Group
                      clipX={0}
                      clipY={0}
                      clipWidth={template.width}
                      clipHeight={template.height}
                    >
                    {backgroundImage ? (
                      <KonvaImage
                        name="background"
                        image={backgroundImage}
                        x={0}
                        y={0}
                        width={template.width}
                        height={template.height}
                        crop={backgroundCrop}
                      />
                    ) : null}

                    {template.layers.map((layer) =>
                      isShapeLayer(layer) ? (
                        <ShapeLayerNode
                          key={layer.id}
                          layer={layer}
                          canDrag={canEditLayer(layer) && activeCanvasTool === "move" && !imageCropEditLayerId}
                          isEditingImageCrop={imageCropEditLayerId === layer.id}
                          setNode={(node) => {
                            if (node) layerRefs.current[layer.id] = node;
                          }}
                          onSelect={(event) => selectLayerFromCanvas(layer.id, event)}
                          onContextMenu={(event) => openLayerContextMenu(layer.id, event)}
                          onDragStart={(event) => handleLayerDragStart(layer.id, event)}
                          onDragMove={(event) => handleLayerDragMove(layer.id, event)}
                          onDragEnd={(event) => handleLayerDragEnd(layer.id, event)}
                          onDblClick={(event) => beginFrameImageCropEdit(layer.id, event)}
                          onImageCropDragStart={(event) => handleImageCropDragStart(layer.id, event)}
                          onImageCropDragMove={(event) => handleImageCropDragMove(layer.id, event)}
                          onImageCropDragEnd={(event) => handleImageCropDragEnd(layer.id, event)}
                          onTransform={(event) => handleLayerTransform(layer.id, event)}
                          onTransformEnd={(event) => handleLayerTransformEnd(layer.id, event)}
                        />
                      ) : (
                        <KonvaText
                          key={layer.id}
                          ref={(node) => {
                            if (node) layerRefs.current[layer.id] = node;
                          }}
                          text={formatLayerValue(layer, selectedRow)}
                          x={layer.x}
                          y={layer.y}
                          width={layer.width}
                          fontFamily={layer.fontFamily}
                          fontSize={layer.fontSize}
                          fontStyle={layerFontStyleValue(layer)}
                          fill={layer.color}
                          align={layer.align}
                          lineHeight={layer.lineHeight}
                          letterSpacing={layer.letterSpacing}
                          draggable={canEditLayer(layer) && activeCanvasTool === "move" && !imageCropEditLayerId}
                          visible={inlineTextEditor?.layerId !== layer.id}
                          onMouseDown={(event) => selectLayerFromCanvas(layer.id, event)}
                          onTap={(event) => selectLayerFromCanvas(layer.id, event)}
                          onContextMenu={(event) => openLayerContextMenu(layer.id, event)}
                          onDblClick={(event) => beginInlineFreeTextEdit(layer, event)}
                          onDblTap={(event) => beginInlineFreeTextEdit(layer, event)}
                          onClick={(event) => {
                            if (!isAdminWorkspace && layer.clientPrompt) beginInlineFreeTextEdit(layer, event);
                          }}
                          onMouseEnter={(event) => {
                            if (isAdminWorkspace || !layer.clientPrompt) return;
                            const pointer = event.target.getStage()?.getPointerPosition();
                            if (pointer) setHoveredClientPrompt({ text: layer.clientPrompt, x: pointer.x + 12, y: pointer.y + 12 });
                            const stage = event.target.getStage();
                            if (stage) stage.container().style.cursor = "text";
                          }}
                          onMouseMove={(event) => {
                            if (isAdminWorkspace || !layer.clientPrompt) return;
                            const pointer = event.target.getStage()?.getPointerPosition();
                            if (pointer) setHoveredClientPrompt({ text: layer.clientPrompt, x: pointer.x + 12, y: pointer.y + 12 });
                          }}
                          onMouseLeave={(event) => {
                            if (!isAdminWorkspace && layer.clientPrompt) setHoveredClientPrompt(null);
                            const stage = event.target.getStage();
                            if (stage) stage.container().style.cursor = "";
                          }}
                          onDragStart={(event) => handleLayerDragStart(layer.id, event)}
                          onDragMove={(event) => handleLayerDragMove(layer.id, event)}
                          onDragEnd={(event) => handleLayerDragEnd(layer.id, event)}
                          onTransform={(event) => handleLayerTransform(layer.id, event)}
                          onTransformEnd={(event) => handleLayerTransformEnd(layer.id, event)}
                        />
                      )
                    )}
                    {showLegacyImageCropGuide && imageCropGuideRect ? (
                      <>
                        <Rect
                          ref={(node) => {
                            imageCropGuideRectRef.current = node;
                          }}
                          name="image-crop-guide"
                          x={imageCropGuideRect.x}
                          y={imageCropGuideRect.y}
                          width={imageCropGuideRect.width}
                          height={imageCropGuideRect.height}
                          stroke="#0ea5ff"
                          strokeWidth={Math.max(1.5, 2 / stageScale)}
                          dash={[6 / stageScale, 4 / stageScale]}
                          listening={false}
                        />
                        {getVisibleImageCropGuideHandlePoints(imageCropGuideRect).map(([x, y], index) => (
                          <KonvaCircle
                            key={`image-crop-guide-handle-${index}`}
                            ref={(node) => {
                              imageCropGuideHandleRefs.current[index] = node;
                            }}
                            name="image-crop-guide"
                            x={x}
                            y={y}
                            radius={Math.max(4, 5 / stageScale)}
                            fill="#ffffff"
                            stroke="#0ea5ff"
                            strokeWidth={Math.max(1.5, 2 / stageScale)}
                            draggable={Boolean(imageCropEditLayer && canUseFrameSlot(imageCropEditLayer))}
                            listening={Boolean(imageCropEditLayer && canUseFrameSlot(imageCropEditLayer))}
                            onMouseDown={(event) => {
                              event.cancelBubble = true;
                            }}
                            onTap={(event) => {
                              event.cancelBubble = true;
                            }}
                            onMouseEnter={(event) => {
                              const stage = event.target.getStage();
                              if (stage) {
                                stage.container().style.cursor =
                                  index === 0 || index === 2 ? "nwse-resize" : "nesw-resize";
                              }
                            }}
                            onMouseLeave={(event) => {
                              const stage = event.target.getStage();
                              if (stage) stage.container().style.cursor = "";
                            }}
                            onDragStart={(event) =>
                              imageCropEditLayerId
                                ? handleImageCropScaleStart(imageCropEditLayerId, event)
                                : undefined
                            }
                            onDragMove={(event) =>
                              imageCropEditLayerId
                                ? handleImageCropScaleMove(imageCropEditLayerId, event)
                                : undefined
                            }
                            onDragEnd={(event) =>
                              imageCropEditLayerId
                                ? handleImageCropScaleEnd(imageCropEditLayerId, event)
                                : undefined
                            }
                          />
                        ))}
                      </>
                    ) : null}
                    {selectionBox.visible ? (
                      <Rect
                        {...normalizeBox(selectionBox)}
                        fill="rgba(37, 111, 230, 0.08)"
                        stroke="#256fe6"
                        strokeWidth={1}
                        dash={[7, 5]}
                        listening={false}
                      />
                    ) : null}
                    {alignmentGuides.map((guide) => (
                      <Line
                        key={guide.id}
                        points={guide.points}
                        stroke="#8b3dff"
                        strokeWidth={Math.max(1, 1 / stageScale)}
                        dash={[7 / stageScale, 5 / stageScale]}
                        listening={false}
                      />
                    ))}
                    </Group>
                    <Transformer
                      ref={transformerRef}
                      visible={activeCanvasTool === "move" && !inlineTextEditor && !imageCropEditLayerId}
                      rotateEnabled={selectionHasRotatableImage}
                      rotateLineVisible={false}
                      rotateAnchorAngle={180}
                      rotateAnchorOffset={34}
                      rotateAnchorCursor="grab"
                      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                      rotationSnapTolerance={5}
                      anchorStyleFunc={styleTransformerAnchor}
                      enabledAnchors={
                        selectedLayerIsStandaloneImage
                          ? ["top-left", "top-right", "bottom-right", "bottom-left"]
                          : selectionHasShape
                          ? [
                              "top-left",
                              "top-center",
                              "top-right",
                              "middle-left",
                              "middle-right",
                              "bottom-left",
                              "bottom-center",
                              "bottom-right"
                            ]
                          : ["middle-left", "middle-right"]
                      }
                      keepRatio={selectedLayerIsStandaloneImage}
                      anchorSize={10}
                      padding={0}
                      borderStroke={selectedLayerIsStandaloneImage ? "#8b3dff" : selectedOutlineColor}
                      anchorStroke={selectedLayerIsStandaloneImage ? "#8b3dff" : selectedOutlineColor}
                      anchorFill="#ffffff"
                      boundBoxFunc={(oldBox, newBox) =>
                        newBox.width < (selectionHasShape ? 24 : 80) ||
                        newBox.height < (selectionHasShape ? 24 : 8)
                          ? oldBox
                          : newBox
                      }
                    />
                  </Layer>
                  </Stage>
                  {hoveredClientPrompt ? (
                    <div
                      className="client-info-tooltip"
                      style={{ left: hoveredClientPrompt.x, top: hoveredClientPrompt.y }}
                      role="tooltip"
                    >
                      {hoveredClientPrompt.text}
                    </div>
                  ) : null}
                  {selectionBox.visible ? (
                    <div
                      className="workspace-selection-overlay"
                      style={{
                        left: Math.min(selectionBox.x, selectionBox.x + selectionBox.width) * stageScale,
                        top: Math.min(selectionBox.y, selectionBox.y + selectionBox.height) * stageScale,
                        width: Math.abs(selectionBox.width) * stageScale,
                        height: Math.abs(selectionBox.height) * stageScale
                      }}
                    />
                  ) : null}
                  {selectedLayer && !imageCropEditLayerId ? (
                    <div
                      ref={layerTransformOverlayRef}
                      className="layer-transform-overlay"
                      style={{
                        left: selectedLayer.x * stageScale,
                        top: selectedLayer.y * stageScale,
                        width: selectedLayer.width * stageScale,
                        height:
                          (layerRefs.current[selectedLayer.id]?.height() ||
                            selectedLayer.height ||
                            selectedLayer.width) * stageScale
                      }}
                    >
                      <i className="top-left" />
                      <i className="top-right" />
                      <i className="bottom-right" />
                      <i className="bottom-left" />
                    </div>
                  ) : null}
                  {imageCropGuideRect ? (
                    <div
                      ref={imageCropGuideOverlayRef}
                      className="image-crop-guide-overlay"
                      style={{
                        left: imageCropGuideRect.x * stageScale,
                        top: imageCropGuideRect.y * stageScale,
                        width: imageCropGuideRect.width * stageScale,
                        height: imageCropGuideRect.height * stageScale
                      }}
                      onPointerDown={(event) => {
                        if (event.target !== event.currentTarget || !imageCropEditLayer) return;
                        const imageNode = layerRefs.current[imageCropEditLayer.id];
                        if (!(imageNode instanceof Konva.Image)) return;
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        stageRef.current?.setPointersPositions(event.nativeEvent);
                        handleImageCropDragStart(
                          imageCropEditLayer.id,
                          { cancelBubble: false, target: imageNode } as unknown as Konva.KonvaEventObject<DragEvent>
                        );
                      }}
                      onPointerMove={(event) => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId) || !imageCropEditLayer) return;
                        const imageNode = layerRefs.current[imageCropEditLayer.id];
                        if (!(imageNode instanceof Konva.Image)) return;
                        stageRef.current?.setPointersPositions(event.nativeEvent);
                        handleImageCropDragMove(
                          imageCropEditLayer.id,
                          { cancelBubble: false, target: imageNode } as unknown as Konva.KonvaEventObject<DragEvent>
                        );
                      }}
                      onPointerUp={(event) => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId) || !imageCropEditLayer) return;
                        const imageNode = layerRefs.current[imageCropEditLayer.id];
                        if (!(imageNode instanceof Konva.Image)) return;
                        event.currentTarget.releasePointerCapture(event.pointerId);
                        stageRef.current?.setPointersPositions(event.nativeEvent);
                        handleImageCropDragEnd(
                          imageCropEditLayer.id,
                          { cancelBubble: false, target: imageNode } as unknown as Konva.KonvaEventObject<DragEvent>
                        );
                      }}
                    >
                      {["top-left", "top-right", "bottom-right", "bottom-left"].map((corner) => (
                        <button
                          key={corner}
                          type="button"
                          className={`image-crop-guide-overlay-handle ${corner}`}
                          aria-label="Resize image crop"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            event.currentTarget.setPointerCapture(event.pointerId);
                            stageRef.current?.setPointersPositions(event.nativeEvent);
                            handleImageCropScaleStart(
                              imageCropEditLayer!.id,
                              { cancelBubble: false } as Konva.KonvaEventObject<DragEvent>
                            );
                          }}
                          onPointerMove={(event) => {
                            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                            stageRef.current?.setPointersPositions(event.nativeEvent);
                            handleImageCropScaleMove(
                              imageCropEditLayer!.id,
                              { cancelBubble: false } as Konva.KonvaEventObject<DragEvent>
                            );
                          }}
                          onPointerUp={(event) => {
                            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                            event.currentTarget.releasePointerCapture(event.pointerId);
                            stageRef.current?.setPointersPositions(event.nativeEvent);
                            handleImageCropScaleEnd(
                              imageCropEditLayer!.id,
                              { cancelBubble: false } as Konva.KonvaEventObject<DragEvent>
                            );
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {layerContextMenu ? (
                    <div
                      className="layer-context-menu"
                      style={{
                        left: Math.max(8, Math.min(layerContextMenu.x + 8, template.width * stageScale - 220)),
                        top: Math.max(8, Math.min(layerContextMenu.y + 8, template.height * stageScale - 214))
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          duplicateSelectedLayers();
                          setLayerContextMenu(null);
                        }}
                      >
                        <Copy size={15} />
                        {"Nhân bản"}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerOrder(layerContextMenu.layerId, "front")}
                      >
                        <BringToFront size={15} />
                        Đưa lên trên cùng
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerOrder(layerContextMenu.layerId, "forward")}
                      >
                        <ArrowUp size={15} />
                        Đưa lên một lớp
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerOrder(layerContextMenu.layerId, "backward")}
                      >
                        <ArrowDown size={15} />
                        Đưa xuống một lớp
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerOrder(layerContextMenu.layerId, "back")}
                      >
                        <SendToBack size={15} />
                        Đưa xuống dưới cùng
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteLayerFromContextMenu(layerContextMenu.layerId)}
                      >
                        <Trash2 size={15} />
                        Xóa
                      </button>
                    </div>
                  ) : null}
                  {inlineTextEditor
                    ? (() => {
                        const layer = template.layers.find(
                          (item) => item.id === inlineTextEditor.layerId
                        );
                        if (!layer || typeof layer.content !== "string") return null;
                        const editorLineHeight = Math.max(
                          16,
                          layer.fontSize * layer.lineHeight * stageScale
                        );
                        const editorLineCount = Math.max(
                          1,
                          inlineTextEditor.value.split(/\r\n|\r|\n/).length
                        );
                        return (
                          <textarea
                            ref={inlineTextEditorRef}
                            className="inline-text-editor"
                            rows={editorLineCount}
                            value={inlineTextEditor.value}
                            style={{
                              left: layer.x * stageScale,
                              top: layer.y * stageScale,
                              width: Math.max(80, layer.width * stageScale),
                              height: editorLineHeight * editorLineCount,
                              fontFamily: layer.fontFamily,
                              fontSize: Math.max(12, layer.fontSize * stageScale),
                              fontWeight: layer.fontWeight,
                              fontStyle: layer.fontStyle || "normal",
                              color: layer.color,
                              lineHeight: `${editorLineHeight}px`,
                              letterSpacing: layer.letterSpacing * stageScale,
                              textAlign: layer.align
                            }}
                            onChange={(event) =>
                              setInlineTextEditor((current) =>
                                current
                                  ? {
                                      ...current,
                                      value: event.target.value
                                    }
                                  : current
                              )
                            }
                            onBlur={() => commitInlineTextEdit()}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelInlineTextEdit();
                                return;
                              }
                              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                                event.preventDefault();
                                commitInlineTextEdit();
                              }
                            }}
                          />
                        );
                      })()
                    : null}
                </div>
                </div>
              </div>
              <div
                className="canvas-bottom-bar floating-canvas-tools"
                aria-label="Công cụ canvas"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="history-controls bottom-history-controls" aria-label="Undo and redo">
                  <button
                    type="button"
                    className="history-btn"
                    title="Undo (Ctrl+Z)"
                    onClick={undoLastChange}
                    disabled={!canUndo}
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    type="button"
                    className="history-btn"
                    title="Redo (Ctrl+Y)"
                    onClick={redoLastChange}
                    disabled={!canRedo}
                  >
                    <Redo2 size={17} />
                  </button>
                </div>
                <div className="bottom-tool-group" aria-label="Canvas tools">
                  <button
                    type="button"
                    className={activeCanvasTool === "move" ? "tool-btn active" : "tool-btn"}
                    title="Move (V)"
                    aria-pressed={activeCanvasTool === "move"}
                    onClick={() => setActiveCanvasTool("move")}
                  >
                    <MousePointer2 size={17} />
                    <span>Move</span>
                  </button>
                  <button
                    type="button"
                    className={activeCanvasTool === "hand" ? "tool-btn active" : "tool-btn"}
                    title="Hand tool (H)"
                    aria-pressed={activeCanvasTool === "hand"}
                    onClick={() => setActiveCanvasTool("hand")}
                  >
                    <Hand size={17} />
                    <span>Hand</span>
                  </button>
                  <button
                    type="button"
                    className={activeCanvasTool === "text" ? "tool-btn active" : "tool-btn"}
                    title="Thêm text (T)"
                    aria-pressed={activeCanvasTool === "text"}
                    onClick={() => setActiveCanvasTool("text")}
                    disabled={!canAddFreeTextLayer}
                  >
                    <Type size={18} />
                    <span>Chữ</span>
                  </button>
                  {isAdminWorkspace ? (
                    <button
                      type="button"
                      className="tool-btn"
                      title="Thêm trường thông tin cho khách hàng"
                      onClick={addClientInfoField}
                    >
                      <TextCursorInput size={18} />
                      <span>Thêm trường thông tin</span>
                    </button>
                  ) : null}
                </div>
                <div className="zoom-controls bottom-zoom-controls" aria-label="Zoom controls">
                  <button
                    type="button"
                    className="zoom-btn"
                    title="Zoom out"
                    aria-label="Zoom out"
                    disabled={zoomLevel <= MIN_ZOOM}
                    onClick={() => changeZoom(-0.1)}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    className="zoom-slider"
                    type="range"
                    min={MIN_ZOOM * 100}
                    max={MAX_ZOOM * 100}
                    step={5}
                    value={zoomPercent}
                    aria-label="Zoom"
                    onChange={(event) => setZoomFromSlider(event.target.value)}
                  />
                  <div className="zoom-value slider-zoom-value">{zoomPercent}%</div>
                  <button
                    type="button"
                    className="zoom-btn"
                    title="Zoom in"
                    aria-label="Zoom in"
                    disabled={zoomLevel >= MAX_ZOOM}
                    onClick={() => changeZoom(0.1)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    className="fit-btn"
                    title="Fit"
                    onClick={fitCanvasToFrame}
                  >
                    <Maximize2 size={16} />
                    Fit
                  </button>
                </div>
              </div>
            </div>
          </section>

        </section>
      </main>

      {pagePendingDelete ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal confirm-modal">
            <div className="modal-head">
              <div className="modal-icon danger-icon">
                <X size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={() => setPagePendingDeleteId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <h2>Xóa trang?</h2>
            <p className="confirm-copy">
              Trang <strong>{pagePendingDelete.name}</strong> sẽ bị xóa vĩnh viễn và không thể
              khôi phục lại được.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setPagePendingDeleteId(null)}
              >
                Hủy
              </button>
              <button type="button" className="btn danger" onClick={confirmPendingPageDelete}>
                Xóa trang
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adminSettingsDialog}

      {showDatasetLibraryModal ? (
        <div className="library-page-backdrop" role="region" aria-label="Quản lý dữ liệu">
          <div className="admin-modal data-library-modal">
            <div className="modal-head">
              <div className="modal-icon">
                <FileSpreadsheet size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={closeDatasetLibraryModal}
              >
                <X size={18} />
              </button>
            </div>

            <h2>Quản lý dữ liệu</h2>

            <div className="data-library-actions">
              <button type="button" className="btn blue" onClick={openDataImportFromLibrary}>
                <FileSpreadsheet size={18} />
                Tải lên dữ liệu mới
              </button>
              <label className="search-control data-library-search">
                <Search size={18} />
                <input
                  value={datasetSearch}
                  onChange={(event) => setDatasetSearch(event.target.value)}
                  placeholder="Tìm kiếm dữ liệu"
                />
              </label>
              <button
                type="button"
                className="btn danger"
                disabled={!selectedDatasetIds.length}
                onClick={deleteSelectedDatasets}
              >
                <X size={18} />
                Xóa dữ liệu đã chọn
              </button>
            </div>

            <div className="data-library-list">
              <table className="data-library-table">
                <thead>
                  <tr>
                    <th className="data-library-check-col"></th>
                    <th>Tên dữ liệu</th>
                    <th>Dòng</th>
                    <th>Cột</th>
                    <th>Ngày import</th>
                    <th>Nguồn</th>
                    <th className="data-library-actions-col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDatasets.map((item) => (
                    <tr
                      key={item.id}
                      className={item.id === appState.activeDatasetId ? "active" : undefined}
                    >
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${item.name}`}
                          checked={selectedDatasetIds.includes(item.id)}
                          onChange={() => toggleDatasetSelection(item.id)}
                        />
                      </td>
                      <td>
                        <input
                          className="data-name-input"
                          value={item.name}
                          onChange={(event) => renameDataset(item.id, event.target.value)}
                          onBlur={(event) => {
                            if (!event.target.value.trim()) {
                              renameDataset(item.id, "Dữ liệu chưa đặt tên");
                            }
                          }}
                          title="Bấm vào tên để đổi tên dữ liệu"
                        />
                      </td>
                      <td>{item.rows.length}</td>
                      <td>{item.columns.length}</td>
                      <td>{new Date(item.importedAt).toLocaleDateString("vi-VN")}</td>
                      <td>
                        {item.sourceUrl
                          ? item.sourceKind === "google-sheet"
                            ? "Google Sheet"
                            : "File cloud"
                          : item.sourceKind === "upload"
                            ? "Dữ liệu đã đọc"
                            : "Dữ liệu cũ"}
                      </td>
                      <td>
                        <div className="data-library-row-actions">
                          <button
                            type="button"
                            className={
                              previewDatasetId === item.id
                                ? "icon-btn data-preview-toggle active"
                                : "icon-btn data-preview-toggle"
                            }
                            title="Xem preview dữ liệu"
                            aria-label={`Xem preview ${item.name}`}
                            onClick={() =>
                              setPreviewDatasetId((current) =>
                                current === item.id ? null : item.id
                              )
                            }
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn data-delete-toggle"
                            title="Xóa dữ liệu"
                            aria-label={`Xóa ${item.name}`}
                            onClick={() => deleteDataset(item.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!visibleDatasets.length ? (
                    <tr>
                      <td className="data-library-empty" colSpan={7}>
                        {appState.datasets.length
                          ? "Không tìm thấy dữ liệu phù hợp."
                          : "Chưa có dữ liệu."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {datasetLibraryError ? (
              <div className="form-error">{datasetLibraryError}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {previewDataset ? (
        <div className="modal-backdrop data-preview-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal data-preview-modal">
            <div className="modal-head">
              <div className="modal-icon">
                <FileSpreadsheet size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng preview"
                onClick={() => setPreviewDatasetId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <h2>{previewDataset.name}</h2>
            <p className="data-preview-subtitle">
              {previewDataset.rows.length} dòng · {previewDataset.columns.length} cột
            </p>

            <div className="review-table-wrap data-preview-table-wrap">
              <table className="review-table">
                <thead>
                  <tr>
                    {previewDataset.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewDataset.rows.slice(0, 10).map((row, rowIndex) => (
                    <tr key={`${previewDataset.id}_${rowIndex}`}>
                      {previewDataset.columns.map((column) => (
                        <td key={`${previewDataset.id}_${rowIndex}_${column}`}>
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewDataset.rows.length > 10 ? (
              <div className="data-preview-note">Đang hiển thị 10 dòng đầu tiên.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDataImportModal ? (
        <div
          className={isDataImportInline ? "library-page-backdrop data-import-page-backdrop" : "modal-backdrop"}
          role={isDataImportInline ? "region" : "dialog"}
          aria-modal={isDataImportInline ? undefined : true}
          aria-label={isDataImportInline ? "Import dữ liệu" : undefined}
        >
          <div className="admin-modal data-import-modal">
            <div className="modal-head">
              <div className="modal-icon">
                <FileSpreadsheet size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={closeDataImportModal}
              >
                <X size={18} />
              </button>
            </div>

            <h2>{pendingDataset ? "Review dữ liệu" : "Import dữ liệu"}</h2>

            {!pendingDataset ? (
              <>
                <label
                  className={isDraggingDataFile ? "data-dropzone dragging" : "data-dropzone"}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingDataFile(true);
                  }}
                  onDragLeave={() => setIsDraggingDataFile(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    if (file) prepareDatasetReview(pendingDatasetFromFile(file));
                  }}
                >
                  <UploadIcon />
                  <strong>Kéo thả Excel/CSV vào đây</strong>
                  <span>Hoặc bấm để chọn file `.xlsx` / `.csv`</span>
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) prepareDatasetReview(pendingDatasetFromFile(file));
                      event.target.value = "";
                    }}
                  />
                </label>

                <div className="import-divider">
                  <span>hoặc</span>
                </div>

                <div className="form-group">
                  <label>Link Google Sheet public</label>
                  <input
                    value={publicSheetUrl}
                    onChange={(event) => setPublicSheetUrl(event.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
                <button
                  type="button"
                  className="btn blue full"
                  disabled={isReadingData}
                  onClick={() => prepareDatasetReview(pendingDatasetFromPublicSheet(publicSheetUrl))}
                >
                  <FileSpreadsheet size={18} />
                  Import link Google Sheet
                </button>
              </>
            ) : (
              <>
                <div className="review-summary">
                  <div>
                    <strong>{pendingDataset.name}</strong>
                    <span>{pendingDataset.rows.length} dòng · {pendingDataset.columns.length} cột</span>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setPendingDataset(null)}
                  >
                    Đổi nguồn
                  </button>
                </div>

                <div className="column-review">
                  {pendingDataset.columns.map((column) => (
                    <div key={column} className="review-column-chip">
                      {column}
                    </div>
                  ))}
                </div>

                <div className="review-table-wrap">
                  <table className="review-table">
                    <thead>
                      <tr>
                        {pendingDataset.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDataset.rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {pendingDataset.columns.map((column) => (
                            <td key={column}>{row[column]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="btn blue full"
                  disabled={isUploadingDataset}
                  onClick={commitPendingDataset}
                >
                  <FileSpreadsheet size={18} />
                  {isUploadingDataset ? "Đang tải file lên cloud..." : "Tải lên danh sách"}
                </button>
              </>
            )}

            {isReadingData ? <div className="import-status">Đang đọc dữ liệu...</div> : null}
            {isUploadingDataset ? (
              <div className="import-status">Đang lưu file dữ liệu lên Cloudinary...</div>
            ) : null}
            {dataImportError ? <div className="form-error">{dataImportError}</div> : null}
          </div>
        </div>
      ) : null}

      {showTemplateLibraryModal ? (
        <div className="template-library-page-backdrop" role="region" aria-label="Quản lý ảnh mẫu">
          <div className="admin-modal template-library-modal">
            <div className="modal-head">
              <div className="modal-icon">
                <ImageUp size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={closeTemplateLibraryModal}
              >
                <X size={18} />
              </button>
            </div>

            <h2>Quản lý ảnh mẫu</h2>

            <div className="template-library-layout">
              <aside className="template-folder-pane">
                <div className="template-folder-head">
                  <span>Dự án</span>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Tạo dự án"
                    onClick={() => createTemplateFolder(null)}
                  >
                    <FolderPlus size={17} />
                  </button>
                </div>
                <div className="template-folder-list">
                  {flattenedTemplateFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className={
                        folder.id === activeTemplateFolderId
                          ? "template-folder-row active"
                          : "template-folder-row"
                      }
                      style={{ paddingLeft: 12 + folder.depth * 16 }}
                      onClick={() => selectTemplateFolder(folder.id)}
                    >
                      <ProjectFolderIcon size="sm" />
                      {editingTemplateFolderId === folder.id ? (
                        <input
                          value={folder.name}
                          autoFocus
                          onClick={(event) => event.stopPropagation()}
                          onFocus={() => selectTemplateFolder(folder.id)}
                          onChange={(event) => renameTemplateFolder(folder.id, event.target.value)}
                          onBlur={(event) =>
                            finishRenameTemplateFolder(folder.id, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                            if (event.key === "Escape") setEditingTemplateFolderId(null);
                          }}
                          title="Tên dự án"
                        />
                      ) : (
                        <span className="template-folder-name">{folder.name}</span>
                      )}
                      <div className="template-folder-menu-wrap">
                        <button
                          type="button"
                          className="template-folder-menu-btn"
                          title="Tùy chọn dự án"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTemplateFolderId(folder.id);
                            setOpenTemplateFolderMenuId((current) =>
                              current === folder.id ? null : folder.id
                            );
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openTemplateFolderMenuId === folder.id ? (
                          <div className="template-folder-menu">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingTemplateFolderId(folder.id);
                                setOpenTemplateFolderMenuId(null);
                              }}
                            >
                              Sửa tên
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteTemplateFolder(folder.id);
                              }}
                            >
                              Xóa dự án
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="template-folder-content">
                <div className="template-current-folder-head">
                  <div>
                    <h3>{selectedTemplateFolder?.name || "Dự án"}</h3>
                    <p>
                      {selectedFolderChildren.length} dự án con · {templatesInSelectedFolder.length} ảnh
                    </p>
                  </div>
                  <div className="template-library-actions">
                    {canCreateSubfolder ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => createTemplateFolder(activeTemplateFolderId)}
                      >
                        <FolderPlus size={18} />
                        Tạo dự án con
                      </button>
                    ) : null}
                    <label className={selectedTemplateFolder ? "btn blue" : "btn blue disabled"}>
                      <ImageUp size={18} />
                      Tải ảnh vào dự án
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={!selectedTemplateFolder}
                        onChange={(event) => {
                          prepareTemplateUploads(Array.from(event.target.files || []));
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {selectedTemplateIds.length ? (
                      <button
                        type="button"
                        className="btn danger"
                        onClick={deleteSelectedTemplates}
                      >
                        <X size={18} />
                        Xóa {selectedTemplateIds.length} ảnh đã chọn
                      </button>
                    ) : null}
                  </div>
                </div>

                {selectedFolderChildren.length ? (
                  <div className="folder-chip-grid">
                    {selectedFolderChildren.map((folder) => (
                      <button
                        type="button"
                        key={folder.id}
                        className="folder-chip-card"
                        onClick={() => selectTemplateFolder(folder.id)}
                      >
                        <ProjectFolderIcon size="md" />
                        {folder.name}
                      </button>
                    ))}
                  </div>
                ) : null}

                {pendingTemplateUploads.length ? (
                  <div className="pending-template-card">
                    <div className="project-upload-list">
                      {pendingTemplateUploads.map((upload) => (
                        <div key={upload.id} className={`project-upload-item ${upload.status}`}>
                          <img src={upload.dataUrl} alt="" />
                          <span>{upload.status === "saved" ? "Đã lưu" : upload.status === "uploading" ? "Đang tải lên" : upload.status === "error" ? upload.error || "Lỗi tải ảnh" : "Chờ lưu"}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pending-template-main">
                      <div className="form-group">
                        <label>Tên ảnh mới</label>
                        <input
                          value={pendingTemplateUploads[0]?.name || ""}
                          onChange={(event) =>
                            pendingTemplateUploads[0]
                              ? updatePendingTemplateUpload(pendingTemplateUploads[0].id, { name: event.target.value })
                              : undefined
                          }
                          placeholder="Nhập tên ảnh"
                        />
                      </div>
                      <div className="pending-template-meta">
                        {pendingTemplateUploadSaveCount} ảnh chờ lưu
                      </div>
                      <div className="pending-template-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setPendingTemplateUploads([])}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="btn blue"
                          disabled={isUploadingAsset || !pendingTemplateUploadSaveCount}
                          onClick={savePendingTemplateUpload}
                        >
                          Lưu tất cả
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="template-grid">
                  {templatesInSelectedFolder.map((item) => (
                    <div
                      key={item.id}
                      className={
                        item.id === appState.activeTemplateId
                          ? "template-card active"
                          : "template-card"
                      }
                    >
                      <div className="template-thumb-wrap">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${item.name}`}
                          checked={selectedTemplateIds.includes(item.id)}
                          onChange={() => toggleTemplateSelection(item.id)}
                        />
                        {getTemplateLibraryImage(item) ? (
                          <img
                            src={getPreviewImageSrc(getTemplateLibraryImage(item))}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="blank-image-placeholder" aria-label={`${item.name} chưa có ảnh`} />
                        )}
                        <button
                          type="button"
                          className="icon-btn preview-template-btn"
                          title="Preview"
                          aria-label={`Preview ${item.name}`}
                          onClick={() => setPreviewTemplate(item)}
                        >
                          <Eye size={17} />
                        </button>
                      </div>
                      <input
                        className="template-name-input"
                        value={item.name}
                        onChange={(event) => renameTemplateImage(item.id, event.target.value)}
                        onBlur={(event) => {
                          if (!event.target.value.trim()) renameTemplateImage(item.id, "Ảnh chưa đặt tên");
                        }}
                        title="Bấm vào tên để đổi tên ảnh"
                      />
                      <div className="template-meta">
                        {item.width} x {item.height}px
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {templateLibraryError ? (
              <div className="form-error">{templateLibraryError}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showTemplatePickerModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal template-library-modal template-picker-modal">
            <div className="modal-head">
              <div className="modal-icon">
                <ImageUp size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={closeTemplatePickerModal}
              >
                <X size={18} />
              </button>
            </div>

            <h2>Chọn ảnh</h2>

            <div className="template-library-layout template-picker-layout">
              <section className="template-folder-content">
                <div className="template-current-folder-head">
                  <div>
                    <h3>
                      {appState.templateFolders.find((folder) => folder.id === activePickerFolderId)
                        ?.name || "Dự án"}
                    </h3>
                    <p>{templatesInPickerFolder.length} ảnh</p>
                  </div>
                </div>
                {pickerImageFolders.length ? (
                  <div className="picker-image-folder-list" aria-label="Folder ảnh">
                    <button
                      type="button"
                      className={
                        activePickerImageFolderId
                          ? "picker-image-folder-chip"
                          : "picker-image-folder-chip active"
                      }
                      onClick={() => {
                        setSelectedPickerImageFolderId("");
                        setSelectedPickerTemplateId(null);
                      }}
                    >
                      Tất cả
                    </button>
                    {pickerImageFolders.map((folder) => (
                      <button
                        type="button"
                        key={folder.id}
                        className={
                          activePickerImageFolderId === folder.id
                            ? "picker-image-folder-chip active"
                            : "picker-image-folder-chip"
                        }
                        onClick={() => {
                          setSelectedPickerImageFolderId(folder.id);
                          setSelectedPickerTemplateId(null);
                        }}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="template-grid">
                  {templatesInPickerFolder.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={
                        item.id === selectedPickerTemplateId
                          ? "template-card picker-card active"
                          : "template-card picker-card"
                      }
                      disabled={!getTemplateLibraryImage(item)}
                      onClick={() => setSelectedPickerTemplateId(item.id)}
                    >
                      <div className="template-thumb-wrap">
                        {getTemplateLibraryImage(item) ? (
                          <img
                            src={getPreviewImageSrc(getTemplateLibraryImage(item))}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="blank-image-placeholder" aria-label={`${item.name} chưa có ảnh`} />
                        )}
                      </div>
                      <div className="template-picker-name">{item.name}</div>
                      <div className="template-meta">
                        {item.width} x {item.height}px
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="template-picker-footer">
              <div className="template-picker-selected">
                {selectedPickerTemplate ? selectedPickerTemplate.name : "Chưa chọn ảnh"}
              </div>
              <button
                type="button"
                className="btn blue"
                disabled={!selectedPickerTemplate || !getTemplateLibraryImage(selectedPickerTemplate)}
                onClick={() =>
                  selectedPickerTemplate
                    ? applyTemplateImageToCurrentTemplate(selectedPickerTemplate.id)
                    : undefined
                }
              >
                <ImageUp size={18} />
                Import
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewTemplate ? (
        <div className="modal-backdrop preview-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal template-preview-modal">
            <div className="modal-head">
              <div>
                <h2>{previewTemplate.name}</h2>
                <p className="template-preview-meta">
                  {previewTemplate.width} x {previewTemplate.height}px
                </p>
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={() => setPreviewTemplate(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="template-preview-frame">
              {getTemplateLibraryImage(previewTemplate) ? (
                <img
                  src={getTemplateLibraryImage(previewTemplate)}
                  alt={previewTemplate.name}
                  decoding="async"
                />
              ) : (
                <div className="blank-preview-placeholder">Chưa có ảnh</div>
              )}
            </div>
            <div className="template-preview-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setPreviewTemplate(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFontLibraryModal ? (
        <div className="library-page-backdrop" role="region" aria-label="Quản lý phông chữ">
          <div className="admin-modal font-library-modal">
            <div className="modal-head">
              <div className="modal-icon">
                <Type size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={closeFontLibraryModal}
              >
                <X size={18} />
              </button>
            </div>

            <h2>Quản lý phông chữ</h2>

            <div className="font-library-actions">
              <label className="btn blue">
                <Type size={18} />
                Thêm font mới
                <input
                  type="file"
                  multiple
                  accept=".woff,.woff2,.ttf,.otf"
                  onChange={(event) => {
                    handleFontUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            {uploadedFontGroups.length ? (
              <div className="font-list">
                {uploadedFontGroups.map((group) => (
                  <div key={group.family} className="font-card">
                    <div className="font-preview" style={{ fontFamily: group.family }}>
                      Aa 0123
                    </div>
                    <div className="font-card-main">
                      <div className="font-card-title" style={{ fontFamily: group.family }}>
                        {group.family}
                      </div>
                      <div className="font-card-meta">
                        {group.styles.length} style · Font tải lên
                      </div>
                      <div className="font-style-list">
                        {group.styles.map((style) => (
                          <span key={`${style.family}_${style.styleName}_${style.fileName || "font"}`}>
                            {style.styleName || "Regular"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => deleteFontFamily(group.family)}
                    >
                      <X size={18} />
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-empty-state">
                <Type size={36} />
                <strong>Chưa có font tải lên</strong>
                <span>Bấm “Thêm font mới” để tải một hoặc nhiều file `.woff`, `.woff2`, `.ttf`, `.otf`.</span>
              </div>
            )}

            {fontLibraryError ? <div className="form-error">{fontLibraryError}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UploadIcon() {
  return (
    <div className="dropzone-icon">
      <FileSpreadsheet size={28} />
    </div>
  );
}

