import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Image as KonvaImage,
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
  BadgeCheck,
  Check,
  ChevronDown,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  ImageUp,
  Lock,
  LogOut,
  Maximize2,
  Pipette,
  Plus,
  Rows3,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  TextCursorInput,
  Type,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";

type RowData = Record<string, string>;

type Dataset = {
  id: string;
  name: string;
  columns: string[];
  rows: RowData[];
  keyColumn: string;
  importedAt: string;
};

type PendingDataset = Omit<Dataset, "id" | "importedAt">;

type TextLayer = {
  id: string;
  name: string;
  column: string;
  x: number;
  y: number;
  width: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase";
};

type LayerBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Template = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundDataUrl: string;
  layers: TextLayer[];
  updatedAt: string;
};

type CustomFont = {
  family: string;
  dataUrl: string;
  fileName?: string;
  styleName?: string;
};

type AppState = {
  templates: Template[];
  activeTemplateId: string;
  datasets: Dataset[];
  activeDatasetId: string;
  customFonts: CustomFont[];
};

const FALLBACK_TEXT_LAYER: TextLayer = {
  id: "layer_fallback",
  name: "Lớp chữ",
  column: "",
  x: 80,
  y: 80,
  width: 320,
  fontFamily: "Be Vietnam Pro",
  fontSize: 42,
  fontWeight: "700",
  color: "#071025",
  align: "left",
  lineHeight: 1.16,
  letterSpacing: 0,
  textTransform: "none"
};

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
};

type HexColorInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

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

function HexColorInput({ value, onChange, disabled = false }: HexColorInputProps) {
  const [draft, setDraft] = useState(value.toUpperCase());
  const nativeColorRef = useRef<HTMLInputElement>(null);
  const canPickScreenColor = typeof window !== "undefined" && Boolean(window.EyeDropper);

  useEffect(() => {
    setDraft(value.toUpperCase());
  }, [value]);

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

  return (
    <div className="hex-color-field">
      <input
        ref={nativeColorRef}
        className="native-color-input"
        type="color"
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
      />
      <button
        type="button"
        className="hex-color-swatch"
        style={{ backgroundColor: value }}
        title="Chọn màu"
        disabled={disabled}
        onClick={() => nativeColorRef.current?.click()}
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
    </div>
  );
}

function CustomSelect({ value, options, onChange, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  function commitValue(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value)
    );

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
      const nextIndex = (currentIndex + direction + options.length) % options.length;
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
        <span>{selectedOption?.label || ""}</span>
        <ChevronDown size={18} />
      </button>

      {isOpen ? (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => {
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
        </div>
      ) : null}
    </div>
  );
}

const STORAGE_KEY = "oh-property-maker-state-v2";
const ADMIN_KEY = "oh-property-maker-admin-ok";
const ADMIN_ACCOUNT_KEY = "oh-property-maker-admin-account";
const ADMIN_PASSWORD_HASH_KEY = "oh-property-maker-admin-password-hash";
const DEFAULT_ADMIN_ACCOUNT = "admin";
const DEFAULT_ADMIN_HASH =
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

const BASE_FONTS = ["Be Vietnam Pro", "Arial", "Inter", "Georgia", "Times New Roman"];

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
    DEFAULT_ADMIN_HASH
  );
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
  const candidates = ["macan", "ma_can", "code", "unitcode", "canho", "ma"];
  return (
    columns.find((column) => candidates.includes(normalizeText(column))) ||
    columns.find((column) => normalizeText(column).includes("macan")) ||
    columns[0] ||
    ""
  );
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

function cleanFontFamily(fileName: string) {
  return fileName
    .replace(/\.(woff2?|ttf|otf)$/i, "")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function fontInfoFromFileName(fileName: string) {
  const baseName = cleanFontFamily(fileName);
  const styleMatch = baseName.match(
    /(thin|extra\s*light|extralight|light|regular|medium|semi\s*bold|semibold|bold|extra\s*bold|extrabold|black|italic)$/i
  );
  const styleName = styleMatch?.[0]?.replace(/([a-z])([A-Z])/g, "$1 $2") || "Regular";
  const family = styleMatch
    ? baseName.slice(0, styleMatch.index).replace(/[-_]+$/g, "").trim()
    : baseName;
  return {
    family: family || baseName || "Font tùy chỉnh",
    styleName
  };
}

async function registerFont(font: CustomFont) {
  if (!("FontFace" in window)) return;
  const existing = Array.from(document.fonts).some((item) => item.family === font.family);
  if (existing) return;
  const face = new FontFace(font.family, `url(${font.dataUrl})`);
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
    <text x="130" y="126" fill="#ffffff" font-family="Arial" font-size="28" font-weight="700">OneHousing</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
}

function normalizeLayer(layer: Partial<TextLayer> | null | undefined, index = 0): TextLayer {
  const align = layer?.align;
  const textTransform = layer?.textTransform;
  return {
    ...FALLBACK_TEXT_LAYER,
    ...layer,
    id: typeof layer?.id === "string" && layer.id ? layer.id : uid("layer"),
    name: typeof layer?.name === "string" && layer.name ? layer.name : `Lớp chữ ${index + 1}`,
    column: typeof layer?.column === "string" ? layer.column : "",
    x: Number.isFinite(Number(layer?.x)) ? Number(layer?.x) : FALLBACK_TEXT_LAYER.x,
    y: Number.isFinite(Number(layer?.y)) ? Number(layer?.y) : FALLBACK_TEXT_LAYER.y,
    width: normalizePositiveNumber(layer?.width, FALLBACK_TEXT_LAYER.width),
    fontFamily:
      typeof layer?.fontFamily === "string" && layer.fontFamily
        ? layer.fontFamily
        : FALLBACK_TEXT_LAYER.fontFamily,
    fontSize: normalizePositiveNumber(layer?.fontSize, FALLBACK_TEXT_LAYER.fontSize),
    fontWeight:
      typeof layer?.fontWeight === "string" && layer.fontWeight
        ? layer.fontWeight
        : FALLBACK_TEXT_LAYER.fontWeight,
    color:
      typeof layer?.color === "string" && normalizeHexColor(layer.color)
        ? normalizeHexColor(layer.color)!
        : FALLBACK_TEXT_LAYER.color,
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
        : `Page ${index + 1}`;
  return {
    id: typeof template?.id === "string" && template.id ? template.id : uid("template"),
    name,
    width: normalizePositiveNumber(template?.width, 1080),
    height: normalizePositiveNumber(template?.height, 1350),
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

function getNextPageName(templates: Template[]) {
  const usedNumbers = new Set<number>();
  templates.forEach((template) => {
    const match = template.name.trim().match(/^page\s+(\d+)$/i);
    if (!match) return;
    usedNumbers.add(Number(match[1]));
  });

  let pageNumber = 1;
  while (usedNumbers.has(pageNumber)) {
    pageNumber += 1;
  }
  return `Page ${pageNumber}`;
}

function isBlankTemplate(template: Template | undefined) {
  return Boolean(template && !template.backgroundDataUrl && template.layers.length === 0);
}

function createInitialState(): AppState {
  const dataset: Dataset = {
    id: "dataset_sample",
    name: "Danh sách căn mẫu",
    columns: ["mã căn", "dự án", "tòa", "tầng", "loại căn", "diện tích", "hướng", "giá bán"],
    rows: [
      {
        "mã căn": "S2.1512",
        "dự án": "The Global City",
        "tòa": "S2",
        "tầng": "15",
        "loại căn": "2PN+",
        "diện tích": "72.5 m2",
        "hướng": "Đông Nam",
        "giá bán": "7.8 tỷ"
      },
      {
        "mã căn": "G3.2408",
        "dự án": "Masteri Waterfront",
        "tòa": "G3",
        "tầng": "24",
        "loại căn": "3PN",
        "diện tích": "91.2 m2",
        "hướng": "Tây Bắc",
        "giá bán": "9.6 tỷ"
      }
    ],
    keyColumn: "mã căn",
    importedAt: new Date().toISOString()
  };

  const template: Template = {
    id: "template_default",
    name: "Ảnh mẫu OneHousing",
    width: 1080,
    height: 1350,
    backgroundDataUrl: defaultTemplateImage(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: "layer_code",
        name: "Mã căn",
        column: "mã căn",
        x: 130,
        y: 918,
        width: 400,
        fontFamily: "Be Vietnam Pro",
        fontSize: 72,
        fontWeight: "800",
        color: "#071025",
        align: "left",
        lineHeight: 1.08,
        letterSpacing: 0,
        textTransform: "uppercase"
      },
      {
        id: "layer_project",
        name: "Dự án",
        column: "dự án",
        x: 130,
        y: 1006,
        width: 760,
        fontFamily: "Be Vietnam Pro",
        fontSize: 34,
        fontWeight: "700",
        color: "#256fe6",
        align: "left",
        lineHeight: 1.18,
        letterSpacing: 0,
        textTransform: "none"
      },
      {
        id: "layer_area",
        name: "Diện tích",
        column: "diện tích",
        x: 130,
        y: 1134,
        width: 260,
        fontFamily: "Be Vietnam Pro",
        fontSize: 36,
        fontWeight: "800",
        color: "#071025",
        align: "left",
        lineHeight: 1.12,
        letterSpacing: 0,
        textTransform: "none"
      },
      {
        id: "layer_price",
        name: "Giá bán",
        column: "giá bán",
        x: 620,
        y: 1134,
        width: 330,
        fontFamily: "Be Vietnam Pro",
        fontSize: 42,
        fontWeight: "800",
        color: "#3b6d11",
        align: "right",
        lineHeight: 1.12,
        letterSpacing: 0,
        textTransform: "none"
      }
    ]
  };

  return {
    templates: [template],
    activeTemplateId: template.id,
    datasets: [dataset],
    activeDatasetId: dataset.id,
    customFonts: []
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved) as AppState;
    if (!parsed.templates?.length || !parsed.datasets?.length) return createInitialState();
    const templates = parsed.templates.map((template, index) => normalizeTemplate(template, index));
    const activeTemplateId = templates.some((template) => template.id === parsed.activeTemplateId)
      ? parsed.activeTemplateId
      : templates[0].id;
    return {
      ...parsed,
      templates,
      activeTemplateId,
      customFonts: Array.isArray(parsed.customFonts) ? parsed.customFonts : []
    };
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

function getCoverCrop(image: HTMLImageElement | null, width: number, height: number) {
  if (!image) return undefined;
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  if (imageRatio > canvasRatio) {
    const cropWidth = image.height * canvasRatio;
    return {
      x: (image.width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: image.height
    };
  }
  const cropHeight = image.width / canvasRatio;
  return {
    x: 0,
    y: (image.height - cropHeight) / 2,
    width: image.width,
    height: cropHeight
  };
}

function formatLayerValue(layer: TextLayer, row: RowData | undefined) {
  let value = row?.[layer.column] || `{${layer.column}}`;
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
  b: { x: number; y: number; width: number; height: number }
) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
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

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(["layer_code"]);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_KEY) === "1");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pagePendingDeleteId, setPagePendingDeleteId] = useState<string | null>(null);
  const [adminAccount, setAdminAccount] = useState(() => getStoredAdminAccount());
  const [adminLoginName, setAdminLoginName] = useState(() => getStoredAdminAccount());
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [adminSettingsName, setAdminSettingsName] = useState(() => getStoredAdminAccount());
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminSettingsMessage, setAdminSettingsMessage] = useState("");
  const [adminSettingsError, setAdminSettingsError] = useState("");
  const [showDatasetLibraryModal, setShowDatasetLibraryModal] = useState(false);
  const [showDataImportModal, setShowDataImportModal] = useState(false);
  const [showTemplateLibraryModal, setShowTemplateLibraryModal] = useState(false);
  const [showFontLibraryModal, setShowFontLibraryModal] = useState(false);
  const [fontLibraryError, setFontLibraryError] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [datasetLibraryError, setDatasetLibraryError] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [pendingTemplateUpload, setPendingTemplateUpload] = useState<{
    name: string;
    dataUrl: string;
    width: number;
    height: number;
  } | null>(null);
  const [templateLibraryError, setTemplateLibraryError] = useState("");
  const [pendingDataset, setPendingDataset] = useState<PendingDataset | null>(null);
  const [publicSheetUrl, setPublicSheetUrl] = useState("");
  const [dataImportError, setDataImportError] = useState("");
  const [isReadingData, setIsReadingData] = useState(false);
  const [isDraggingDataFile, setIsDraggingDataFile] = useState(false);
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [exportMimeType, setExportMimeType] = useState<"image/png" | "image/jpeg">("image/png");
  const [exportScale, setExportScale] = useState<"1" | "0.5" | "0.75">("1");
  const [stageWidth, setStageWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<Record<string, Konva.Text>>({});
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const isZoomShortcutPressedRef = useRef(false);
  const appStateRef = useRef(appState);
  const selectedLayerIdsRef = useRef(selectedLayerIds);
  const isAdminRef = useRef(isAdmin);
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

  const template = useMemo(
    () =>
      appState.templates.find((item) => item.id === appState.activeTemplateId) ||
      appState.templates[0],
    [appState.activeTemplateId, appState.templates]
  );
  const pagePendingDelete = pagePendingDeleteId
    ? appState.templates.find((item) => item.id === pagePendingDeleteId) || null
    : null;

  const dataset = useMemo(
    () =>
      appState.datasets.find((item) => item.id === appState.activeDatasetId) ||
      appState.datasets[0],
    [appState.activeDatasetId, appState.datasets]
  );

  const selectedRow = dataset.rows[selectedRowIndex] || dataset.rows[0];
  const selectedLayers = template.layers.filter((layer) => selectedLayerIds.includes(layer.id));
  const selectedLayer = selectedLayers[0] || null;
  const hasMultiSelection = selectedLayers.length > 1;
  const backgroundImage = useImage(template.backgroundDataUrl);
  const backgroundCrop = getCoverCrop(backgroundImage, template.width, template.height);
  const availableFonts = [...BASE_FONTS, ...appState.customFonts.map((font) => font.family)];
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
    return Array.from(groups.values());
  }, [appState.customFonts]);

  const filteredRows = useMemo(() => {
    const needle = normalizeText(search);
    if (!needle) return dataset.rows.map((row, index) => ({ row, index }));
    return dataset.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) =>
        Object.values(row).some((value) => normalizeText(String(value)).includes(needle))
      );
  }, [dataset.rows, search]);

  const fitScale = useMemo(() => {
    if (!stageWidth) return 0.5;
    return Math.min(1, Math.max(0.08, (stageWidth - 72) / template.width));
  }, [stageWidth, template.width]);
  const stageScale = fitScale * zoomLevel;
  const zoomPercent = Math.round(zoomLevel * 100);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      setStorageWarning("");
    } catch {
      setStorageWarning(
        "Không lưu được dữ liệu vào trình duyệt vì dung lượng ảnh quá lớn. Trang mới vẫn dùng được trong phiên hiện tại."
      );
    }
  }, [appState]);

  useEffect(() => {
    appState.customFonts.forEach((font) => {
      registerFont(font).catch(() => undefined);
    });
  }, [appState.customFonts]);

  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const resize = () => setStageWidth(wrap.clientWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const shell = canvasShellRef.current;
    if (!shell) return;

    const lockScrollWhileZooming = (event: WheelEvent) => {
      if (!isZoomShortcutPressedRef.current) return;
      event.preventDefault();
    };

    shell.addEventListener("wheel", lockScrollWhileZooming, { passive: false });
    return () => shell.removeEventListener("wheel", lockScrollWhileZooming);
  }, []);

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
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedLayerIds
      .map((id) => textRefs.current[id])
      .filter(Boolean);
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerIds, template.layers]);

  useEffect(() => {
    appStateRef.current = appState;
    selectedLayerIdsRef.current = selectedLayerIds;
    isAdminRef.current = isAdmin;
  }, [appState, selectedLayerIds, isAdmin]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() === "z") {
        isZoomShortcutPressedRef.current = true;
        return;
      }

      const selectedIds = selectedLayerIdsRef.current;
      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        isAdminRef.current &&
        selectedIds.length
      ) {
        event.preventDefault();
        const selectedIdSet = new Set(selectedIds);
        setAppState((current) => ({
          ...current,
          templates: current.templates.map((item) =>
            item.id === current.activeTemplateId
              ? {
                  ...item,
                  updatedAt: new Date().toISOString(),
                  layers: item.layers.filter((layer) => !selectedIdSet.has(layer.id))
                }
              : item
          )
        }));
        setSelectedLayerIds([]);
        return;
      }

      const arrowMoves: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }
      };
      const move = arrowMoves[event.key];
      if (!move || !isAdminRef.current || !selectedIds.length) {
        return;
      }

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const selectedIdSet = new Set(selectedIds);
      setAppState((current) => ({
        ...current,
        templates: current.templates.map((item) =>
          item.id === current.activeTemplateId
            ? {
                ...item,
                updatedAt: new Date().toISOString(),
                layers: item.layers.map((layer) =>
                  selectedIdSet.has(layer.id)
                    ? {
                        ...layer,
                        x: Math.round(layer.x + move.x * step),
                        y: Math.round(layer.y + move.y * step)
                      }
                    : layer
                )
              }
            : item
        )
      }));
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
  }, []);

  function updateTemplate(updater: (template: Template) => Template) {
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
        selectedLayerIds.includes(layer.id) ? { ...layer, ...patch } : layer
      )
    }));
  }

  function getSelectedLayerBounds() {
    return selectedLayers.map((layer) => {
      const node = textRefs.current[layer.id];
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
        height: Math.max(layer.fontSize, layer.fontSize * layer.lineHeight)
      };
    });
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

  function applyLayerPositions(positions: Record<string, { x: number; y: number }>) {
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((layer) =>
        positions[layer.id] ? { ...layer, ...positions[layer.id] } : layer
      )
    }));
  }

  function alignSelectedLayers(
    axis: "horizontal" | "vertical",
    placement: "start" | "center" | "end"
  ) {
    if (!isAdmin || selectedLayers.length < 2) return;
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
    if (!isAdmin || selectedLayers.length < 3) return;
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
    if (!isAdmin || selectedLayers.length < 2) return;
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
    if (!column || !isAdmin) return;
    const layer: TextLayer = {
      id: uid("layer"),
      name: column,
      column,
      x,
      y,
      width: Math.min(420, template.width - x - 32),
      fontFamily: availableFonts[0],
      fontSize: 42,
      fontWeight: "700",
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
  }

  function removeSelectedLayer() {
    if (!selectedLayerIds.length || !isAdmin) return;
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.filter((layer) => !selectedLayerIds.includes(layer.id))
    }));
    setSelectedLayerIds([]);
  }

  async function handleAdminUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminError("");
    if (adminLoginName.trim() !== getStoredAdminAccount()) {
      setAdminError("Tài khoản quản trị không đúng");
      return;
    }
    const hash = await sha256(adminCode.trim());
    if (hash !== getStoredAdminPasswordHash()) {
      setAdminError("Mật khẩu quản trị không đúng");
      return;
    }
    localStorage.setItem(ADMIN_KEY, "1");
    setIsAdmin(true);
    setAdminAccount(getStoredAdminAccount());
    setAdminLoginName(getStoredAdminAccount());
    setAdminCode("");
    setShowAdminModal(false);
  }

  function logoutAdmin() {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
    setSelectedLayerIds([]);
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
    const nextAccount = adminSettingsName.trim();
    if (!nextAccount) {
      setAdminSettingsError("Vui lòng nhập tên tài khoản");
      return;
    }
    if (adminNewPassword || adminConfirmPassword) {
      if (adminNewPassword.length < 4) {
        setAdminSettingsError("Mật khẩu mới cần ít nhất 4 ký tự");
        return;
      }
      if (adminNewPassword !== adminConfirmPassword) {
        setAdminSettingsError("Xác nhận mật khẩu chưa khớp");
        return;
      }
      localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await sha256(adminNewPassword.trim()));
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    }
    localStorage.setItem(ADMIN_ACCOUNT_KEY, nextAccount);
    setAdminAccount(nextAccount);
    setAdminLoginName(nextAccount);
    setAdminSettingsName(nextAccount);
    setAdminSettingsMessage("Đã lưu thông tin quản trị");
  }

  function openTemplateLibraryModal() {
    if (!isAdmin) return;
    setShowTemplateLibraryModal(true);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
  }

  function closeTemplateLibraryModal() {
    setShowTemplateLibraryModal(false);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
    setPendingTemplateUpload(null);
    setPreviewTemplate(null);
  }

  async function prepareTemplateUpload(file: File | undefined) {
    if (!file || !isAdmin) return;
    const dataUrl = await fileToDataUrl(file);
    const image = await loadHtmlImage(dataUrl);
    setPendingTemplateUpload({
      name: file.name.replace(/\.[^.]+$/, "") || "Ảnh mẫu mới",
      dataUrl,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height
    });
    setTemplateLibraryError("");
  }

  function savePendingTemplateUpload() {
    if (!pendingTemplateUpload || !isAdmin) return;
    if (isBlankTemplate(template)) {
      updateTemplate((current) => ({
        ...current,
        width: pendingTemplateUpload.width,
        height: pendingTemplateUpload.height,
        backgroundDataUrl: pendingTemplateUpload.dataUrl,
        updatedAt: new Date().toISOString()
      }));
      setPendingTemplateUpload(null);
      setSelectedLayerIds([]);
      setZoomLevel(1);
      closeTemplateLibraryModal();
      return;
    }

    const nextTemplate: Template = {
      id: uid("template"),
      name: pendingTemplateUpload.name.trim() || "Ảnh mẫu mới",
      width: pendingTemplateUpload.width,
      height: pendingTemplateUpload.height,
      backgroundDataUrl: pendingTemplateUpload.dataUrl,
      layers: [],
      updatedAt: new Date().toISOString()
    };
    setAppState((current) => ({
      ...current,
      templates: [nextTemplate, ...current.templates],
      activeTemplateId: nextTemplate.id
    }));
    setPendingTemplateUpload(null);
    setSelectedLayerIds([]);
    setZoomLevel(1);
  }

  function importTemplateToEditor(templateId: string) {
    const nextTemplate = appState.templates.find((item) => item.id === templateId);
    if (!nextTemplate) return;
    if (
      template.id !== templateId &&
      isBlankTemplate(template) &&
      nextTemplate.backgroundDataUrl
    ) {
      updateTemplate((current) => ({
        ...current,
        width: nextTemplate.width,
        height: nextTemplate.height,
        backgroundDataUrl: nextTemplate.backgroundDataUrl,
        updatedAt: new Date().toISOString()
      }));
      setSelectedLayerIds([]);
      setZoomLevel(1);
      closeTemplateLibraryModal();
      return;
    }

    setAppState((current) => ({
      ...current,
      activeTemplateId: templateId
    }));
    setSelectedLayerIds(nextTemplate.layers[0] ? [nextTemplate.layers[0].id] : []);
    setZoomLevel(1);
    closeTemplateLibraryModal();
  }

  function activatePage(templateId: string) {
    const nextTemplate = appState.templates.find((item) => item.id === templateId);
    if (!nextTemplate) return;
    setAppState((current) => ({
      ...current,
      activeTemplateId: templateId
    }));
    setSelectedLayerIds(nextTemplate.layers[0] ? [nextTemplate.layers[0].id] : []);
    setZoomLevel(1);
  }

  function addPage() {
    const currentState = appStateRef.current;
    const nextTemplate: Template = {
      id: uid("template"),
      name: getNextPageName(currentState.templates),
      width: 1080,
      height: 1350,
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
    setAppState(nextState);
    setEditingPageId(null);
    setSelectedLayerIds(nextTemplate.layers[0] ? [nextTemplate.layers[0].id] : []);
    setZoomLevel(1);
  }

  function deletePage(templateId: string) {
    if (appState.templates.length <= 1) return;
    const currentIndex = appState.templates.findIndex((item) => item.id === templateId);
    const remaining = appState.templates.filter((item) => item.id !== templateId);
    const fallbackTemplate =
      remaining[Math.min(Math.max(currentIndex, 0), remaining.length - 1)] || remaining[0];

    setAppState((current) => ({
      ...current,
      templates: current.templates.filter((item) => item.id !== templateId),
      activeTemplateId:
        current.activeTemplateId === templateId ? fallbackTemplate.id : current.activeTemplateId
    }));

    if (appState.activeTemplateId === templateId) {
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
    if (!name.trim()) renameTemplate(templateId, "Page");
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

  function toggleTemplateSelection(templateId: string) {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
    );
  }

  function deleteSelectedTemplates() {
    if (!selectedTemplateIds.length || !isAdmin) return;
    if (selectedTemplateIds.length >= appState.templates.length) {
      setTemplateLibraryError("Phải giữ lại ít nhất 1 ảnh mẫu");
      return;
    }
    setAppState((current) => {
      const remaining = current.templates.filter((item) => !selectedTemplateIds.includes(item.id));
      const activeTemplateId = selectedTemplateIds.includes(current.activeTemplateId)
        ? remaining[0].id
        : current.activeTemplateId;
      return {
        ...current,
        templates: remaining,
        activeTemplateId
      };
    });
    if (selectedTemplateIds.includes(appState.activeTemplateId)) {
      const remaining = appState.templates.filter((item) => !selectedTemplateIds.includes(item.id));
      setSelectedLayerIds(remaining[0]?.layers[0] ? [remaining[0].layers[0].id] : []);
    }
    setSelectedTemplateIds([]);
    setTemplateLibraryError("");
  }

  function openFontLibraryModal() {
    if (!isAdmin) return;
    setShowFontLibraryModal(true);
    setFontLibraryError("");
  }

  function closeFontLibraryModal() {
    setShowFontLibraryModal(false);
    setFontLibraryError("");
  }

  async function handleFontUpload(file: File | undefined) {
    if (!file || !isAdmin) return;
    try {
      const { family, styleName } = fontInfoFromFileName(file.name);
      const dataUrl = await fileToDataUrl(file);
      const font = { family, dataUrl, fileName: file.name, styleName };
      await registerFont(font).catch(() => undefined);
      setAppState((current) => ({
        ...current,
        customFonts: [
          ...current.customFonts.filter(
            (item) => !(item.family === family && item.styleName === styleName)
          ),
          font
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
    return nextDataset;
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
    return nextDataset;
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
    setShowDatasetLibraryModal(true);
    setDatasetLibraryError("");
    setSelectedDatasetIds([]);
  }

  function closeDatasetLibraryModal() {
    setShowDatasetLibraryModal(false);
    setDatasetLibraryError("");
    setSelectedDatasetIds([]);
  }

  function openDataImportFromLibrary() {
    setShowDatasetLibraryModal(false);
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
    setPendingDataset(null);
    setDataImportError("");
    setIsReadingData(false);
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

  function activateDataset(datasetId: string) {
    if (!isAdmin) return;
    setAppState((current) => ({
      ...current,
      activeDatasetId: datasetId
    }));
    setSelectedRowIndex(0);
    setSearch("");
  }

  function deleteSelectedDatasets() {
    if (!isAdmin || !selectedDatasetIds.length) return;
    if (selectedDatasetIds.length >= appState.datasets.length) {
      setDatasetLibraryError("Cần giữ lại ít nhất 1 bộ dữ liệu để app hoạt động");
      return;
    }

    setAppState((current) => {
      const datasets = current.datasets.filter(
        (item) => !selectedDatasetIds.includes(item.id)
      );
      const activeDatasetId = datasets.some((item) => item.id === current.activeDatasetId)
        ? current.activeDatasetId
        : datasets[0].id;
      return {
        ...current,
        datasets,
        activeDatasetId
      };
    });
    setSelectedDatasetIds([]);
    setSelectedRowIndex(0);
    setSearch("");
  }

  function commitPendingDataset() {
    if (!pendingDataset || !isAdmin) return;

    const dataset: Dataset = {
      id: uid("dataset"),
      ...pendingDataset,
      importedAt: new Date().toISOString()
    };

    setAppState((current) => ({
      ...current,
      datasets: [dataset, ...current.datasets],
      activeDatasetId: dataset.id
    }));
    setSelectedRowIndex(0);
    setSearch("");
    closeDataImportModal();
    setShowDatasetLibraryModal(true);
  }

  function setKeyColumn(keyColumn: string) {
    if (!isAdmin) return;
    setAppState((current) => ({
      ...current,
      datasets: current.datasets.map((item) =>
        item.id === dataset.id ? { ...item, keyColumn } : item
      )
    }));
  }

  function handleColumnDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    const column = event.dataTransfer.getData("text/column");
    if (!column) return;
    const rect = stageRef.current?.container().getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.round((event.clientX - rect.left) / stageScale));
    const y = Math.max(0, Math.round((event.clientY - rect.top) / stageScale));
    addTextLayer(column, x, y);
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

  function beginCanvasSelection(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!isAdmin) return;
    if ("button" in event.evt && event.evt.button === 1) return;
    const isStageOrBackground =
      event.target === event.target.getStage() || event.target.name() === "background";
    if (!isStageOrBackground) return;
    const pointer = getLogicalPointer();
    if (!pointer) return;
    selectionStartRef.current = pointer;
    isSelectingRef.current = true;
    setSelectionBox({ visible: true, x: pointer.x, y: pointer.y, width: 0, height: 0 });
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

  function finishCanvasSelection() {
    if (!isSelectingRef.current || !selectionStartRef.current) return;
    const pointer = getLogicalPointer();
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
          const node = textRefs.current[layer.id];
          if (!node) return false;
          const box = {
            x: node.x(),
            y: node.y(),
            width: node.width(),
            height: node.height()
          };
          return boxesIntersect(normalizedSelection, box);
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
    const nativeEvent = event.evt as MouseEvent;
    if ("shiftKey" in nativeEvent && (nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey)) {
      setSelectedLayerIds((current) =>
        current.includes(layerId)
          ? current.filter((id) => id !== layerId)
          : [...current, layerId]
      );
      return;
    }
    if (selectedLayerIds.length > 1 && selectedLayerIds.includes(layerId)) {
      return;
    }
    setSelectedLayerIds([layerId]);
  }

  function handleLayerDragStart(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    if (!selectedLayerIds.includes(layerId) || selectedLayerIds.length < 2) {
      groupDragRef.current = null;
      return;
    }
    groupDragRef.current = {
      activeLayerId: layerId,
      startX: event.target.x(),
      startY: event.target.y(),
      positions: selectedLayerIds.reduce<Record<string, { x: number; y: number }>>(
        (positions, id) => {
          const node = textRefs.current[id];
          if (node) positions[id] = { x: node.x(), y: node.y() };
          return positions;
        },
        {}
      )
    };
  }

  function handleLayerDragMove(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    const groupDrag = groupDragRef.current;
    if (!groupDrag || groupDrag.activeLayerId !== layerId) return;
    const deltaX = event.target.x() - groupDrag.startX;
    const deltaY = event.target.y() - groupDrag.startY;
    selectedLayerIds.forEach((id) => {
      if (id === layerId) return;
      const node = textRefs.current[id];
      const position = groupDrag.positions[id];
      if (node && position) {
        node.position({ x: position.x + deltaX, y: position.y + deltaY });
      }
    });
    transformerRef.current?.forceUpdate();
  }

  function handleLayerDragEnd(layerId: string, event: Konva.KonvaEventObject<DragEvent>) {
    const groupDrag = groupDragRef.current;
    if (groupDrag && groupDrag.activeLayerId === layerId) {
      const nextPositions = selectedLayerIds.reduce<Record<string, { x: number; y: number }>>(
        (positions, id) => {
          const node = textRefs.current[id];
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
  }

  function normalizeLayerResizeNode(node: Konva.Text) {
    const nextWidth = Math.max(80, node.width() * node.scaleX());
    node.width(nextWidth);
    node.scaleX(1);
    node.scaleY(1);
    node.getLayer()?.batchDraw();
    transformerRef.current?.forceUpdate();
  }

  function handleLayerTransform(event: Konva.KonvaEventObject<Event>) {
    normalizeLayerResizeNode(event.target as Konva.Text);
  }

  function handleLayerTransformEnd(layerId: string, event: Konva.KonvaEventObject<Event>) {
    const node = event.target as Konva.Text;
    normalizeLayerResizeNode(node);
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((item) =>
        item.id === layerId
          ? {
              ...item,
              x: Math.round(node.x()),
              y: Math.round(node.y()),
              width: Math.round(node.width())
            }
          : item
      )
    }));
  }

  function changeZoom(delta: number) {
    setZoomLevel((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))))
    );
  }

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!isZoomShortcutPressedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const shell = event.currentTarget;
    const stage = stageRef.current;
    const stageRect = stage?.container().getBoundingClientRect();
    if (stageRect) {
      zoomAnchorRef.current = {
        pointerX: event.clientX - shell.getBoundingClientRect().left,
        pointerY: event.clientY - shell.getBoundingClientRect().top,
        logicalX: (event.clientX - stageRect.left) / stageScale,
        logicalY: (event.clientY - stageRect.top) / stageScale
      };
    }
    changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  function beginCanvasPan(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 1) return;
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

  function fitCanvasToFrame() {
    setZoomLevel(1);
  }

  async function exportImage(pixelRatio: 1 | 0.75 | 0.5, mimeType: "image/png" | "image/jpeg") {
    const stage = stageRef.current;
    if (!stage || isExporting) return;
    setIsExporting(true);
    const transformer = transformerRef.current;
    transformer?.visible(false);
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
    } finally {
      stage.scale({ x: currentScale, y: currentScale });
      stage.size({ width: currentWidth, height: currentHeight });
      transformer?.visible(Boolean(selectedLayerIds.length));
      transformer?.getLayer()?.batchDraw();
      setIsExporting(false);
    }
  }

  function resetLocalData() {
    if (!isAdmin) return;
    const fresh = createInitialState();
    setAppState(fresh);
    setSelectedRowIndex(0);
    setSelectedLayerIds(fresh.templates[0].layers[0] ? [fresh.templates[0].layers[0].id] : []);
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="side-brand">
          <img src="https://eventci.vercel.app/favicon.ico" alt="" className="brand-icon" />
          <div>
            <div className="brand-name">OneHousing</div>
            <div className="brand-sub">Ảnh căn</div>
          </div>
        </div>

        <div className="side-section page-section">
          <div className="page-section-head">
            <div className="side-section-title">Trang</div>
            <button
              type="button"
              className="page-add-btn"
              title="Thêm trang"
              aria-label="Thêm trang"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                addPage();
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="page-list">
            {appState.templates.map((item) => (
              <div
                key={item.id}
                className={
                  item.id === appState.activeTemplateId ? "page-row active" : "page-row"
                }
                onClick={() => activatePage(item.id)}
              >
                {editingPageId === item.id ? (
                  <input
                    value={item.name}
                    autoFocus
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => renameTemplate(item.id, event.target.value)}
                    onBlur={(event) => finishEditingPage(item.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        setEditingPageId(null);
                      }
                    }}
                  aria-label={`Tên page ${item.name}`}
                  />
                ) : (
                  <button
                    type="button"
                    className="page-name-btn"
                    title={item.name}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      activatePage(item.id);
                      setEditingPageId(item.id);
                    }}
                  >
                    {item.name}
                  </button>
                )}
                <button
                  type="button"
                  className="page-delete-btn"
                  title="Xóa trang"
                  disabled={appState.templates.length <= 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPagePendingDeleteId(item.id);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="side-footer">
          <button
            type="button"
            className={isAdmin ? "side-link" : "status-pill"}
            disabled={!isAdmin}
            onClick={openAdminSettings}
          >
            {isAdmin ? <BadgeCheck size={16} /> : <Lock size={16} />}
            {isAdmin ? "Đổi mật khẩu" : "Nhân viên"}
          </button>
          {isAdmin ? (
            <button className="side-link" type="button" onClick={logoutAdmin}>
              <LogOut size={18} />
              Đăng xuất
            </button>
          ) : (
            <button className="side-link" type="button" onClick={() => setShowAdminModal(true)}>
              <Lock size={18} />
              Mở quản trị
            </button>
          )}
        </div>
      </aside>

      <main className="main-panel">
        <header className="admin-header">
          <div className="admin-header-main">
            <div className="header-mark">
              <Sparkles size={22} />
            </div>
            <div>
              <h1>Studio ảnh căn</h1>
              <p>{template.name} · {template.width} x {template.height}px</p>
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              className={`btn ${isAdmin ? "" : "disabled"}`}
              type="button"
              disabled={!isAdmin}
              onClick={openTemplateLibraryModal}
            >
              <ImageUp size={18} />
              Ảnh mẫu
            </button>
            <button
              className={`btn ${isAdmin ? "" : "disabled"}`}
              type="button"
              disabled={!isAdmin}
              onClick={openDatasetLibraryModal}
            >
              <FileSpreadsheet size={18} />
              Dữ liệu
            </button>
            <button
              className={`btn ${isAdmin ? "" : "disabled"}`}
              type="button"
              disabled={!isAdmin}
              onClick={openFontLibraryModal}
            >
              <Type size={18} />
              Phông chữ
            </button>
          </div>
        </header>

        {storageWarning ? <div className="storage-warning">{storageWarning}</div> : null}

        <section className="workspace-grid">
          <section className="left-panel panel">
            <div className="panel-head">
              <div>
                <h2>Dữ liệu căn</h2>
                <p>{dataset.rows.length} dòng · {dataset.columns.length} cột</p>
              </div>
              <Columns3 size={20} />
            </div>

            <div className="form-group">
              <label>Bộ dữ liệu</label>
              <CustomSelect
                value={dataset.id}
                options={appState.datasets.map((item) => ({
                  value: item.id,
                  label: item.name
                }))}
                onChange={(nextValue) =>
                  setAppState((current) => ({
                    ...current,
                    activeDatasetId: nextValue
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Mã căn</label>
              <CustomSelect
                value={String(selectedRowIndex)}
                options={dataset.rows.map((row, index) => ({
                  value: String(index),
                  label: row[dataset.keyColumn] || `Dòng ${index + 1}`
                }))}
                onChange={(nextValue) => setSelectedRowIndex(Number(nextValue))}
              />
            </div>

            <div className="search-control">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm căn"
              />
              {search ? (
                <button
                  type="button"
                  className="icon-btn"
                  title="Xóa tìm kiếm"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className="row-list">
              {filteredRows.slice(0, 60).map(({ row, index }) => (
                <button
                  type="button"
                  key={`${row[dataset.keyColumn]}_${index}`}
                  className={index === selectedRowIndex ? "unit-row on" : "unit-row"}
                  onClick={() => setSelectedRowIndex(index)}
                >
                  <span>{row[dataset.keyColumn] || `Dòng ${index + 1}`}</span>
                  <small>
                    {row["dự án"] || row.du_an || row.project || row["du an"] || row["tòa"] || row.toa || ""}
                  </small>
                </button>
              ))}
            </div>

            <div className="column-section">
              <div className="section-label">Cột dữ liệu</div>
              <div className="column-grid">
                {dataset.columns.map((column) => (
                  <button
                    type="button"
                    key={column}
                    className="column-chip"
                    draggable={isAdmin}
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/column", column)
                    }
                    onClick={() => addTextLayer(column)}
                    disabled={!isAdmin}
                  >
                    <Plus size={14} />
                    {column}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="canvas-panel" ref={canvasWrapRef}>
            <div className="canvas-toolbar">
              <div className="zoom-controls" aria-label="Điều khiển zoom">
                <button
                  type="button"
                  className="zoom-btn"
                  title="Thu nhỏ"
                  onClick={() => changeZoom(-ZOOM_STEP)}
                  disabled={zoomLevel <= MIN_ZOOM}
                >
                  <ZoomOut size={18} />
                </button>
                <div className="zoom-value">{zoomPercent}%</div>
                <button
                  type="button"
                  className="zoom-btn"
                  title="Phóng to"
                  onClick={() => changeZoom(ZOOM_STEP)}
                  disabled={zoomLevel >= MAX_ZOOM}
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  type="button"
                  className="fit-btn"
                  title="Vừa khung"
                  onClick={fitCanvasToFrame}
                >
                  <Maximize2 size={16} />
                  Vừa khung
                </button>
              </div>
              <div className="canvas-meta">
                {selectedRow?.[dataset.keyColumn] || "Xem trước"}
              </div>
            </div>

            <div
              ref={canvasShellRef}
              className={isCanvasPanning ? "canvas-shell panning" : "canvas-shell"}
              onWheel={handleCanvasWheel}
              onPointerDown={beginCanvasPan}
              onPointerMove={updateCanvasPan}
              onPointerUp={finishCanvasPan}
              onPointerCancel={finishCanvasPan}
              onPointerLeave={finishCanvasPan}
              onAuxClick={(event) => {
                if (event.button === 1) event.preventDefault();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleColumnDrop}
            >
              <div className="canvas-workspace">
                <div
                  className="stage-card"
                  style={{
                    width: template.width * stageScale,
                    height: template.height * stageScale
                  }}
                >
                  <Stage
                    ref={stageRef}
                    width={template.width * stageScale}
                    height={template.height * stageScale}
                    scaleX={stageScale}
                    scaleY={stageScale}
                    style={{
                      width: template.width * stageScale,
                      height: template.height * stageScale
                    }}
                    onMouseDown={beginCanvasSelection}
                    onMouseMove={updateCanvasSelection}
                    onMouseUp={finishCanvasSelection}
                    onTouchStart={beginCanvasSelection}
                    onTouchMove={updateCanvasSelection}
                    onTouchEnd={finishCanvasSelection}
                  >
                  <Layer>
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

                    {template.layers.map((layer) => (
                      <KonvaText
                        key={layer.id}
                        ref={(node) => {
                          if (node) textRefs.current[layer.id] = node;
                        }}
                        text={formatLayerValue(layer, selectedRow)}
                        x={layer.x}
                        y={layer.y}
                        width={layer.width}
                        fontFamily={layer.fontFamily}
                        fontSize={layer.fontSize}
                        fontStyle={layer.fontWeight}
                        fill={layer.color}
                        align={layer.align}
                        lineHeight={layer.lineHeight}
                        letterSpacing={layer.letterSpacing}
                        draggable={isAdmin}
                        onMouseDown={(event) => selectLayerFromCanvas(layer.id, event)}
                        onTap={(event) => selectLayerFromCanvas(layer.id, event)}
                        onDragStart={(event) => handleLayerDragStart(layer.id, event)}
                        onDragMove={(event) => handleLayerDragMove(layer.id, event)}
                        onDragEnd={(event) => handleLayerDragEnd(layer.id, event)}
                        onTransform={handleLayerTransform}
                        onTransformEnd={(event) => handleLayerTransformEnd(layer.id, event)}
                      />
                    ))}
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
                    <Transformer
                      ref={transformerRef}
                      rotateEnabled={false}
                      enabledAnchors={["middle-left", "middle-right"]}
                      borderStroke="#256fe6"
                      anchorStroke="#256fe6"
                      anchorFill="#ffffff"
                      boundBoxFunc={(oldBox, newBox) =>
                        newBox.width < 80 ? oldBox : newBox
                      }
                    />
                  </Layer>
                  </Stage>
                </div>
              </div>
            </div>
          </section>

          <aside className="right-panel panel">
            <div className="panel-head">
              <div>
                <h2>Thuộc tính</h2>
                <p>
                  {hasMultiSelection
                    ? `${selectedLayers.length} lớp đang chọn`
                    : selectedLayer
                      ? selectedLayer.name
                      : "Chọn lớp chữ"}
                </p>
              </div>
              <SlidersHorizontal size={20} />
            </div>

            {selectedLayer ? (
              <div className="property-stack">
                {hasMultiSelection ? (
                  <div className="alignment-tools">
                    <div className="section-label">Alignment</div>
                    <div className="alignment-row" aria-label="Căn ngang">
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn trái"
                        disabled={!isAdmin}
                        onClick={() => alignSelectedLayers("horizontal", "start")}
                      >
                        <AlignHorizontalJustifyStart size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn giữa ngang"
                        disabled={!isAdmin}
                        onClick={() => alignSelectedLayers("horizontal", "center")}
                      >
                        <AlignHorizontalJustifyCenter size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn phải"
                        disabled={!isAdmin}
                        onClick={() => alignSelectedLayers("horizontal", "end")}
                      >
                        <AlignHorizontalJustifyEnd size={18} />
                      </button>
                    </div>
                    <div className="alignment-row" aria-label="Căn dọc">
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn trên"
                        disabled={!isAdmin}
                        onClick={() => alignSelectedLayers("vertical", "start")}
                      >
                        <AlignVerticalJustifyStart size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn giữa dọc"
                        disabled={!isAdmin}
                        onClick={() => alignSelectedLayers("vertical", "center")}
                      >
                        <AlignVerticalJustifyCenter size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn dưới"
                        disabled={!isAdmin}
                        onClick={() => alignSelectedLayers("vertical", "end")}
                      >
                        <AlignVerticalJustifyEnd size={18} />
                      </button>
                    </div>
                    <div className="alignment-actions">
                      <button
                        type="button"
                        className="align-action"
                        disabled={!isAdmin}
                        onClick={tidySelectedLayers}
                      >
                        <Rows3 size={17} />
                        Dọn đều
                      </button>
                      <button
                        type="button"
                        className="align-action"
                        disabled={!isAdmin || selectedLayers.length < 3}
                        onClick={() => distributeSelectedLayers("vertical")}
                      >
                        <Rows3 size={17} />
                        Dàn đều dọc
                      </button>
                      <button
                        type="button"
                        className="align-action"
                        disabled={!isAdmin || selectedLayers.length < 3}
                        onClick={() => distributeSelectedLayers("horizontal")}
                      >
                        <Columns3 size={17} />
                        Dàn đều ngang
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="form-group">
                  <label>Gắn cột</label>
                  <CustomSelect
                    value={selectedLayer.column}
                    disabled={!isAdmin || hasMultiSelection}
                    options={dataset.columns.map((column) => ({
                      value: column,
                      label: column
                    }))}
                    onChange={(nextValue) =>
                      updateSelectedLayer({
                        column: nextValue,
                        name: nextValue
                      })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phông chữ</label>
                    <CustomSelect
                      value={selectedLayer.fontFamily}
                      disabled={!isAdmin}
                      options={availableFonts.map((font) => ({
                        value: font,
                        label: font
                      }))}
                      onChange={(nextValue) => updateSelectedLayer({ fontFamily: nextValue })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Màu</label>
                    <HexColorInput
                      value={selectedLayer.color}
                      disabled={!isAdmin}
                      onChange={(nextValue) => updateSelectedLayer({ color: nextValue })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cỡ chữ</label>
                    <input
                      type="number"
                      min={8}
                      max={220}
                      value={selectedLayer.fontSize}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        updateSelectedLayer({ fontSize: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Độ đậm</label>
                    <CustomSelect
                      value={selectedLayer.fontWeight}
                      disabled={!isAdmin}
                      options={["400", "500", "600", "700", "800"].map((weight) => ({
                        value: weight,
                        label: weight
                      }))}
                      onChange={(nextValue) => updateSelectedLayer({ fontWeight: nextValue })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rộng</label>
                    <input
                      type="number"
                      min={80}
                      value={Math.round(selectedLayer.width)}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        updateSelectedLayer({ width: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Giãn dòng</label>
                    <input
                      type="number"
                      step={0.05}
                      min={0.8}
                      max={2}
                      value={selectedLayer.lineHeight}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        updateSelectedLayer({ lineHeight: Number(event.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Căn lề</label>
                  <div className="segmented full">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        type="button"
                        key={align}
                        className={selectedLayer.align === align ? "on" : ""}
                        disabled={!isAdmin}
                        onClick={() => updateSelectedLayer({ align })}
                      >
                        {align === "left" ? (
                          <AlignLeft size={16} />
                        ) : align === "center" ? (
                          <AlignCenter size={16} />
                        ) : (
                          <AlignRight size={16} />
                        )}
                        {align === "left" ? "Trái" : align === "center" ? "Giữa" : "Phải"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Kiểu chữ</label>
                  <div className="segmented full">
                    {(["none", "uppercase", "lowercase"] as const).map((mode) => (
                      <button
                        type="button"
                        key={mode}
                        className={selectedLayer.textTransform === mode ? "on" : ""}
                        disabled={!isAdmin}
                        onClick={() => updateSelectedLayer({ textTransform: mode })}
                      >
                        {mode === "none" ? "Gốc" : mode === "uppercase" ? "ABC" : "abc"}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn danger full"
                  disabled={!isAdmin}
                  onClick={removeSelectedLayer}
                >
                  <X size={18} />
                  {hasMultiSelection ? "Xóa nhóm lớp" : "Xóa lớp"}
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <TextCursorInput size={36} />
                <span>Lớp chữ</span>
              </div>
            )}

            <div className="export-panel">
              <div className="section-label">Xuất ảnh</div>
              <div className="export-controls">
                <div className="form-row">
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
                    <label>Kích thước</label>
                    <CustomSelect
                      value={exportScale}
                      options={[
                        { value: "1", label: "Gốc" },
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
                  className="btn blue full"
                  disabled={isExporting}
                  onClick={() =>
                    exportImage(Number(exportScale) as 1 | 0.75 | 0.5, exportMimeType)
                  }
                >
                  <Download size={18} />
                  Tải xuống
                </button>
              </div>
              <div className="export-grid legacy-export-grid">
                <button
                  type="button"
                  className="btn blue"
                  disabled={isExporting}
                  onClick={() => exportImage(1, "image/png")}
                >
                  <Download size={18} />
                  PNG gốc
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={isExporting}
                  onClick={() => exportImage(0.75, "image/png")}
                >
                  <Download size={18} />
                  PNG 0.75x
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={isExporting}
                  onClick={() => exportImage(1, "image/jpeg")}
                >
                  <Download size={18} />
                  JPG gốc
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={isExporting}
                  onClick={() => exportImage(0.5, "image/jpeg")}
                >
                  <Download size={18} />
                  JPG 0.5x
                </button>
              </div>
            </div>

            <div className="admin-tools">
              <div className="section-label">Quản trị</div>
              <div className="form-group">
                <label>Cột khóa</label>
                <CustomSelect
                  value={dataset.keyColumn}
                  disabled={!isAdmin}
                  options={dataset.columns.map((column) => ({
                    value: column,
                    label: column
                  }))}
                  onChange={(nextValue) => setKeyColumn(nextValue)}
                />
              </div>
            </div>
          </aside>
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

      {showAdminModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="admin-modal" onSubmit={handleAdminUnlock}>
            <div className="modal-head">
              <div className="modal-icon">
                <Lock size={22} />
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Đóng"
                onClick={() => setShowAdminModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <h2>Mở quản trị</h2>
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
              <Save size={18} />
              Mở khóa
            </button>
          </form>
        </div>
      ) : null}

      {showAdminSettingsModal ? (
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
              <label htmlFor="admin-settings-name">Tên tài khoản</label>
              <input
                id="admin-settings-name"
                autoFocus
                value={adminSettingsName}
                onChange={(event) => setAdminSettingsName(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="admin-new-password">Mật khẩu mới</label>
              <input
                id="admin-new-password"
                type="password"
                value={adminNewPassword}
                onChange={(event) => setAdminNewPassword(event.target.value)}
                placeholder="Để trống nếu không đổi"
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
      ) : null}

      {showDatasetLibraryModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
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
              {appState.datasets.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.id === appState.activeDatasetId
                      ? "data-library-row active"
                      : "data-library-row"
                  }
                >
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${item.name}`}
                    checked={selectedDatasetIds.includes(item.id)}
                    onChange={() => toggleDatasetSelection(item.id)}
                  />
                  <div className="data-library-main">
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
                    <div className="data-library-meta">
                      <span>{item.rows.length} dòng</span>
                      <span>{item.columns.length} cột</span>
                      <span>Cột khóa: {item.keyColumn}</span>
                      <span>
                        {new Date(item.importedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={item.id === appState.activeDatasetId ? "btn" : "btn blue"}
                    disabled={item.id === appState.activeDatasetId}
                    onClick={() => activateDataset(item.id)}
                  >
                    {item.id === appState.activeDatasetId ? "Đang dùng" : "Dùng bộ này"}
                  </button>
                </div>
              ))}
            </div>

            {datasetLibraryError ? (
              <div className="form-error">{datasetLibraryError}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDataImportModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
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

                <div className="form-group">
                  <label>Cột khóa mã căn</label>
                  <CustomSelect
                    value={pendingDataset.keyColumn}
                    options={pendingDataset.columns.map((column) => ({
                      value: column,
                      label: column
                    }))}
                    onChange={(nextValue) =>
                      setPendingDataset((current) =>
                        current ? { ...current, keyColumn: nextValue } : current
                      )
                    }
                  />
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

                <button type="button" className="btn blue full" onClick={commitPendingDataset}>
                  <FileSpreadsheet size={18} />
                  Tải lên danh sách
                </button>
              </>
            )}

            {isReadingData ? <div className="import-status">Đang đọc dữ liệu...</div> : null}
            {dataImportError ? <div className="form-error">{dataImportError}</div> : null}
          </div>
        </div>
      ) : null}

      {showTemplateLibraryModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
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

            <div className="template-library-actions">
              <label className="btn blue">
                <ImageUp size={18} />
                Tải ảnh mới
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    prepareTemplateUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="btn danger"
                disabled={!selectedTemplateIds.length}
                onClick={deleteSelectedTemplates}
              >
                <X size={18} />
                Xóa ảnh đã chọn
              </button>
            </div>

            {pendingTemplateUpload ? (
              <div className="pending-template-card">
                <img src={pendingTemplateUpload.dataUrl} alt="" />
                <div className="pending-template-main">
                  <div className="form-group">
                    <label>Tên ảnh mới</label>
                    <input
                      value={pendingTemplateUpload.name}
                      onChange={(event) =>
                        setPendingTemplateUpload((current) =>
                          current ? { ...current, name: event.target.value } : current
                        )
                      }
                      placeholder="Nhập tên ảnh"
                    />
                  </div>
                  <div className="pending-template-meta">
                    {pendingTemplateUpload.width} x {pendingTemplateUpload.height}px
                  </div>
                  <div className="pending-template-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setPendingTemplateUpload(null)}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn blue"
                      onClick={savePendingTemplateUpload}
                    >
                      Lưu ảnh
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="template-grid">
              {appState.templates.map((item) => (
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
                    {item.backgroundDataUrl ? (
                      <img src={item.backgroundDataUrl} alt={item.name} />
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
                    <div className="template-thumb-actions">
                      <button
                        type="button"
                        className="btn blue import-template-btn"
                        onClick={() => importTemplateToEditor(item.id)}
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                  <input
                    className="template-name-input"
                    value={item.name}
                    onChange={(event) => renameTemplate(item.id, event.target.value)}
                    onBlur={(event) => {
                      if (!event.target.value.trim()) renameTemplate(item.id, "Ảnh chưa đặt tên");
                    }}
                    title="Bấm vào tên để đổi tên ảnh"
                  />
                  <div className="template-meta">
                    {item.width} x {item.height}px
                  </div>
                </div>
              ))}
            </div>

            {templateLibraryError ? (
              <div className="form-error">{templateLibraryError}</div>
            ) : null}
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
              {previewTemplate.backgroundDataUrl ? (
                <img src={previewTemplate.backgroundDataUrl} alt={previewTemplate.name} />
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
              <button
                type="button"
                className="btn blue"
                onClick={() => importTemplateToEditor(previewTemplate.id)}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFontLibraryModal ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
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
                  accept=".woff,.woff2,.ttf,.otf"
                  onChange={(event) => {
                    handleFontUpload(event.target.files?.[0]);
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
                <span>Bấm “Thêm font mới” để tải `.woff`, `.woff2`, `.ttf`, `.otf`.</span>
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
