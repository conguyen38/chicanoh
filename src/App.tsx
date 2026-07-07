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
  ChevronRight,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  Folder,
  FolderPlus,
  Hand,
  ImageUp,
  Lock,
  LogOut,
  Maximize2,
  MoreHorizontal,
  MousePointer2,
  Pipette,
  Plus,
  Rows3,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  TextCursorInput,
  Trash2,
  Type,
  Redo2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";

type RowData = Record<string, string>;

type CanvasTool = "move" | "hand" | "text";

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
  column: string;
  content?: string;
  x: number;
  y: number;
  width: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle?: "normal" | "italic";
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
  width: number;
  height: number;
  dataUrl: string;
  createdAt: string;
};

type TemplateFolder = {
  id: string;
  name: string;
  parentId: string | null;
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
  templateImages: TemplateImage[];
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
  content: undefined,
  x: 80,
  y: 80,
  width: 320,
  fontFamily: "Be Vietnam Pro",
  fontSize: 42,
  fontWeight: "700",
  fontStyle: "normal",
  color: "#071025",
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
        onInput={(event) => handleChange(event.currentTarget.value)}
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
const ADMIN_KEY = "oh-property-maker-admin-ok";
const ADMIN_LAST_ACTIVITY_KEY = "oh-property-maker-admin-last-activity";
const ADMIN_ACCOUNT_KEY = "oh-property-maker-admin-account";
const ADMIN_PASSWORD_HASH_KEY = "oh-property-maker-admin-password-hash";
const DEFAULT_ADMIN_ACCOUNT = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const DEFAULT_TEMPLATE_FOLDER_ID = "folder_default";
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;
const HISTORY_LIMIT = 80;
const DEFAULT_ADDED_TEXT_FONT_SIZE = 24;
const ADMIN_IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

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
  bold: { label: "Bold", weight: "700" },
  extrablack: { label: "Extra Black", weight: "900" },
  ultrablack: { label: "Extra Black", weight: "900" },
  extrabold: { label: "Extra Bold", weight: "800" },
  ultrabold: { label: "Extra Bold", weight: "800" },
  black: { label: "Black", weight: "900" },
  heavy: { label: "Black", weight: "900" }
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

function layerFontStyleValue(layer: Pick<TextLayer, "fontWeight" | "fontStyle">) {
  return layer.fontStyle === "italic" ? `italic ${layer.fontWeight}` : layer.fontWeight;
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
  const weight = font.fontWeight || "400";
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
    content: typeof layer?.content === "string" ? layer.content : undefined,
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
    fontStyle:
      layer?.fontStyle === "italic" || layer?.fontStyle === "normal"
        ? layer.fontStyle
        : FALLBACK_TEXT_LAYER.fontStyle,
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
    folderId:
      typeof template?.folderId === "string" && template.folderId
        ? template.folderId
        : DEFAULT_TEMPLATE_FOLDER_ID,
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
    width: normalizePositiveNumber(image?.width, 1080),
    height: normalizePositiveNumber(image?.height, 1350),
    dataUrl,
    createdAt:
      typeof image?.createdAt === "string" && image.createdAt
        ? image.createdAt
        : new Date().toISOString()
  };
}

function defaultTemplateFolder(): TemplateFolder {
  return {
    id: DEFAULT_TEMPLATE_FOLDER_ID,
    name: "Ảnh mẫu",
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
        : `Thư mục ${index + 1}`,
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

function isBlankTemplate(template: Template | undefined) {
  return Boolean(template && !template.backgroundDataUrl && template.layers.length === 0);
}

function getTemplateLibraryImage(item: TemplateImage | Template) {
  return "dataUrl" in item ? item.dataUrl : item.backgroundDataUrl;
}

function createInitialState(): AppState {
  const template: Template = {
    id: "template_default",
    name: "Page 1",
    folderId: DEFAULT_TEMPLATE_FOLDER_ID,
    width: 1080,
    height: 1350,
    backgroundDataUrl: "",
    updatedAt: new Date().toISOString(),
    layers: []
  };

  return {
    templateFolders: [
      {
        id: DEFAULT_TEMPLATE_FOLDER_ID,
        name: "Ảnh mẫu",
        parentId: null,
        createdAt: new Date().toISOString()
      }
    ],
    templateImages: [],
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
  };
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
  const templateImages = [...savedImages, ...migratedImages].map((image) => ({
    ...image,
    folderId: folderIds.has(image.folderId) ? image.folderId : fallbackFolderId
  }));
  const templates = parsedAny.templates.filter((template) => !template.libraryDataUrl).map((template, index) => {
    const normalizedTemplate = normalizeTemplate(template, index);
    return {
      ...normalizedTemplate,
      folderId: folderIds.has(normalizedTemplate.folderId)
        ? normalizedTemplate.folderId
        : fallbackFolderId
    };
  });
  if (!templates.length) {
    templates.push({
      id: uid("template"),
      name: "Page 1",
      folderId: fallbackFolderId,
      width: 1080,
      height: 1350,
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
    templateImages,
    templates,
    activeTemplateId,
    datasets,
    activeDatasetId: "",
    customFonts: Array.isArray(parsed.customFonts) ? parsed.customFonts : []
  };
}

function persistedLibraryState(appState: AppState): AppState {
  const initialState = createInitialState();
  return {
    ...initialState,
    templateFolders: appState.templateFolders,
    templateImages: appState.templateImages,
    datasets: appState.datasets,
    customFonts: appState.customFonts
  };
}

function mergePersistedLibraries(workspaceState: AppState, persistedState: AppState): AppState {
  return {
    ...workspaceState,
    templateFolders: persistedState.templateFolders,
    templateImages: persistedState.templateImages,
    datasets: persistedState.datasets,
    customFonts: persistedState.customFonts,
    activeDatasetId: persistedState.datasets.some((dataset) => dataset.id === workspaceState.activeDatasetId)
      ? workspaceState.activeDatasetId
      : ""
  };
}

function appStateForLocalBackup(appState: AppState) {
  const libraryState = persistedLibraryState(appState);
  return {
    ...libraryState,
    templateImages: libraryState.templateImages.filter((image) => !image.dataUrl.startsWith("data:")),
    customFonts: libraryState.customFonts.filter((font) => !font.dataUrl.startsWith("data:"))
  };
}

function workspaceStateForSession(appState: AppState) {
  return {
    templates: appState.templates,
    activeTemplateId: appState.activeTemplateId,
    activeDatasetId: appState.activeDatasetId
  };
}

function mergeSessionWorkspace(appState: AppState, workspace: Partial<AppState> | null | undefined) {
  if (!workspace || !Array.isArray(workspace.templates) || !workspace.templates.length) {
    return appState;
  }
  const templates = workspace.templates.map((template, index) => normalizeTemplate(template, index));
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      nextState = mergePersistedLibraries(
        nextState,
        normalizeAppState(JSON.parse(saved) as AppState)
      );
    }
    const sessionWorkspace = sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    if (sessionWorkspace) {
      nextState = mergeSessionWorkspace(
        nextState,
        JSON.parse(sessionWorkspace) as Partial<AppState>
      );
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
  const [appState, setAppStateBase] = useState<AppState>(() => loadState());
  const isAdminPath = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(["layer_code"]);
  const [isAdmin, setIsAdmin] = useState(() => isAdminSessionValid());
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
  const [showDatasetLibraryModal, setShowDatasetLibraryModal] = useState(false);
  const [showDataImportModal, setShowDataImportModal] = useState(false);
  const [isDataImportInline, setIsDataImportInline] = useState(false);
  const [showTemplateLibraryModal, setShowTemplateLibraryModal] = useState(false);
  const [showTemplatePickerModal, setShowTemplatePickerModal] = useState(false);
  const [showFontLibraryModal, setShowFontLibraryModal] = useState(false);
  const [fontLibraryError, setFontLibraryError] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [previewDatasetId, setPreviewDatasetId] = useState<string | null>(null);
  const [datasetSearch, setDatasetSearch] = useState("");
  const [datasetLibraryError, setDatasetLibraryError] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectedTemplateFolderId, setSelectedTemplateFolderId] = useState(DEFAULT_TEMPLATE_FOLDER_ID);
  const [selectedPickerFolderId, setSelectedPickerFolderId] = useState(DEFAULT_TEMPLATE_FOLDER_ID);
  const [selectedPickerTemplateId, setSelectedPickerTemplateId] = useState<string | null>(null);
  const [editingTemplateFolderId, setEditingTemplateFolderId] = useState<string | null>(null);
  const [openTemplateFolderMenuId, setOpenTemplateFolderMenuId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateImage | null>(null);
  const [pendingTemplateUpload, setPendingTemplateUpload] = useState<{
    name: string;
    dataUrl: string;
    width: number;
    height: number;
    file: File;
  } | null>(null);
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
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({
    status: "loading",
    message: "Đang kết nối cloud..."
  });
  const [exportMimeType, setExportMimeType] = useState<"image/png" | "image/jpeg">("image/png");
  const [exportScale, setExportScale] = useState<"1" | "0.5" | "0.75">("1");
  const [stageWidth, setStageWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeCanvasTool, setActiveCanvasTool] = useState<CanvasTool>("move");
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [inlineTextEditor, setInlineTextEditor] = useState<InlineTextEditor | null>(null);
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
  const inlineTextEditorRef = useRef<HTMLTextAreaElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<Record<string, Konva.Text>>({});
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const isZoomShortcutPressedRef = useRef(false);
  const appStateRef = useRef(appState);
  const selectedLayerIdsRef = useRef(selectedLayerIds);
  const isAdminRef = useRef(isAdmin);
  const undoStackRef = useRef<AppState[]>([]);
  const redoStackRef = useRef<AppState[]>([]);
  const lastSessionTouchRef = useRef(0);
  const remoteSyncEnabledRef = useRef(false);
  const remoteStateReadyRef = useRef(false);
  const skipNextRemoteSaveRef = useRef(false);
  const remoteSaveVersionRef = useRef(0);
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
      return nextState;
    });
    setHistoryVersion((current) => current + 1);
  }

  function undoLastChange() {
    const previousState = undoStackRef.current.pop();
    if (!previousState) return;
    setAppStateBase((current) => {
      redoStackRef.current.push(current);
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
      return nextState;
    });
    setInlineTextEditor(null);
    setSelectedLayerIds([]);
    setHistoryVersion((current) => current + 1);
  }

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
  const selectedTemplateFolder =
    appState.templateFolders.find((folder) => folder.id === activeTemplateFolderId) ||
    appState.templateFolders[0];
  const canCreateSubfolder = Boolean(selectedTemplateFolder && !selectedTemplateFolder.parentId);
  const selectedFolderChildren = appState.templateFolders.filter(
    (folder) => folder.parentId === activeTemplateFolderId
  );
  const templatesInSelectedFolder = appState.templateImages.filter(
    (item) => item.folderId === activeTemplateFolderId && getTemplateLibraryImage(item)
  );
  const templatesInPickerFolder = appState.templateImages.filter(
    (item) => item.folderId === activePickerFolderId && getTemplateLibraryImage(item)
  );
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
  const selectedFontStyleOptions = useMemo(() => {
    const baseOptions = ["100", "200", "300", "400", "500", "600", "700", "800", "900"].map(
      (weight) => ({
        value: `${weight}|normal`,
        label: weight
      })
    );
    if (!selectedLayer) return baseOptions;
    const customOptions = appState.customFonts
      .filter((font) => font.family === selectedLayer.fontFamily)
      .map((font) => ({
        value: `${font.fontWeight || "400"}|${font.fontStyle || "normal"}`,
        label: font.styleName || `${font.fontWeight || "400"}${font.fontStyle === "italic" ? " Italic" : ""}`
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
  const canUndo = historyVersion >= 0 && undoStackRef.current.length > 0;
  const canRedo = historyVersion >= 0 && redoStackRef.current.length > 0;
  const selectedOutlineColor = selectedLayers.some((layer) => typeof layer.content !== "string")
    ? "#dc2626"
    : "#256fe6";
  const backgroundImage = useImage(template.backgroundDataUrl);
  const backgroundCrop = getCoverCrop(backgroundImage, template.width, template.height);
  const availableFonts = Array.from(
    new Set([...BASE_FONTS, ...appState.customFonts.map((font) => font.family)])
  );
  const canEditWorkspace = true;
  const canAddTextLayer = canEditWorkspace;
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
    if (!stageWidth) return 0.5;
    return Math.min(1, Math.max(0.08, (stageWidth - 72) / template.width));
  }, [stageWidth, template.width]);
  const stageScale = fitScale * zoomLevel;
  const zoomPercent = Math.round(zoomLevel * 100);

  useEffect(() => {
    let active = true;

    async function bootstrapCloudState() {
      try {
        const response = await fetch("/api/state", { credentials: "include" });
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
        const remoteState = (data as { state?: AppState | null } | null)?.state;
        if (remoteState) {
          const normalized = normalizeAppState(remoteState);
          skipNextRemoteSaveRef.current = true;
          setAppStateBase((current) => {
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
        } | null;
        if (!active || !response.ok || !data?.authenticated) return;
        touchAdminSession();
        lastSessionTouchRef.current = Date.now();
        setIsAdmin(true);
        if (data.account) {
          localStorage.setItem(ADMIN_ACCOUNT_KEY, data.account);
          setAdminAccount(data.account);
          setAdminLoginName(data.account);
          setAdminSettingsName(data.account);
        }
      } catch {
        // Local admin fallback remains available.
      }
    }

    bootstrapCloudState();
    restoreAdminSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appStateForLocalBackup(appState)));
        setStorageWarning("");
      } catch {
        if (remoteSyncEnabledRef.current) {
          setStorageWarning("");
          return;
        }
        setStorageWarning(
          "Không lưu được dữ liệu vào trình duyệt vì dung lượng ảnh quá lớn. Trang mới vẫn dùng được trong phiên hiện tại."
        );
      }
    }, 180);

    return () => window.clearTimeout(saveTimer);
  }, [appState]);

  useEffect(() => {
    try {
      sessionStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(workspaceStateForSession(appState)));
    } catch {
      // Workspace is still available in memory for the current render session.
    }
  }, [appState.templates, appState.activeTemplateId, appState.activeDatasetId]);

  useEffect(() => {
    if (!remoteSyncEnabledRef.current || !remoteStateReadyRef.current || !isAdmin) return;
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
          body: JSON.stringify({ state: persistedLibraryState(appState) })
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(errorMessageFromApi(data, "Không lưu được Neon"));
        }
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
    appState.templateFolders,
    appState.templateImages,
    appState.datasets,
    appState.customFonts,
    isAdmin
  ]);


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
  }, [appState.templateFolders, selectedTemplateFolderId, selectedPickerFolderId]);

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
  }, [appState, selectedLayerIds, isAdmin]);

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
      if (isControlShortcut && key === "z") {
        event.preventDefault();
        undoLastChange();
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
        if (shortcutTool === "text" && !isAdminRef.current) return;
        event.preventDefault();
        setActiveCanvasTool(shortcutTool);
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
      if (!move || !selectedIds.length) {
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

  function beginInlineFreeTextEdit(
    layer: TextLayer,
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) {
    if (!canEditWorkspace || typeof layer.content !== "string") return;
    event.cancelBubble = true;
    setActiveCanvasTool("move");
    setSelectedLayerIds([layer.id]);
    setInlineTextEditor({
      layerId: layer.id,
      value: layer.content
    });
  }

  function commitInlineTextEdit(value = inlineTextEditor?.value) {
    if (!inlineTextEditor || typeof value !== "string") return;
    const nextValue = value.trim() ? value : "Text";
    updateTemplate((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      layers: current.layers.map((layer) =>
        layer.id === inlineTextEditor.layerId
          ? {
              ...layer,
              content: nextValue,
              name: nextValue.trim() || "Free text"
            }
          : layer
      )
    }));
    setInlineTextEditor(null);
  }

  function cancelInlineTextEdit() {
    setInlineTextEditor(null);
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
    if (!canEditWorkspace || selectedLayers.length < 2) return;
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
    if (!canEditWorkspace || selectedLayers.length < 3) return;
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
    if (!canEditWorkspace || selectedLayers.length < 2) return;
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
    if (!column || !canEditWorkspace) return;
    const layer: TextLayer = {
      id: uid("layer"),
      name: column,
      column,
      x,
      y,
      width: Math.max(80, Math.min(420, template.width - x - 32)),
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
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

  function addFreeTextLayer(x = 120, y = 120) {
    if (!canEditWorkspace) return;
    const layer: TextLayer = {
      id: uid("layer"),
      name: "Free text",
      column: "",
      content: "Text",
      x,
      y,
      width: Math.max(80, Math.min(420, template.width - x - 32)),
      fontFamily: availableFonts[0],
      fontSize: DEFAULT_ADDED_TEXT_FONT_SIZE,
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
    if (!selectedLayerIds.length || !canEditWorkspace) return;
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
        const account = (data as { account?: string } | null)?.account || adminLoginName.trim();
        touchAdminSession();
        lastSessionTouchRef.current = Date.now();
        localStorage.setItem(ADMIN_ACCOUNT_KEY, account);
        setIsAdmin(true);
        setAdminAccount(account);
        setAdminLoginName(account);
        setAdminSettingsName(account);
        setAdminCode("");
        skipNextRemoteSaveRef.current = false;
        if (remoteSyncEnabledRef.current) {
          setCloudSync({ status: "ready", message: "Cloud đã sẵn sàng" });
        }
        return;
      }
      if (response.status !== 404 && response.status !== 500) {
        setAdminError(errorMessageFromApi(data, "Tai khoan hoac mat khau khong dung"));
        return;
      }
    } catch {
      // Fall back to local admin when the Vercel API is not running.
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
    setAdminAccount(getStoredAdminAccount());
    setAdminLoginName(getStoredAdminAccount());
    setAdminCode("");
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
    }
    if (remoteSyncEnabledRef.current) {
      try {
        const response = await fetch("/api/auth/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account: nextAccount,
            password: adminNewPassword.trim()
          })
        });
        const data = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(errorMessageFromApi(data, "Khong luu duoc tai khoan admin"));
        }
        localStorage.setItem(ADMIN_ACCOUNT_KEY, nextAccount);
        if (adminNewPassword) {
          localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, await sha256(adminNewPassword.trim()));
        }
        setAdminNewPassword("");
        setAdminConfirmPassword("");
        setAdminAccount(nextAccount);
        setAdminLoginName(nextAccount);
        setAdminSettingsName(nextAccount);
        setAdminSettingsMessage("Da luu thong tin quan tri tren cloud");
        return;
      } catch (error) {
        setAdminSettingsError(
          error instanceof Error ? error.message : "Khong luu duoc tai khoan admin"
        );
        return;
      }
    }
    if (adminNewPassword) {
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
    setShowDatasetLibraryModal(false);
    setShowFontLibraryModal(false);
    setShowTemplateLibraryModal(true);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
    setSelectedTemplateFolderId(activeTemplateFolderId);
  }

  function closeTemplateLibraryModal() {
    setShowTemplateLibraryModal(false);
    setTemplateLibraryError("");
    setSelectedTemplateIds([]);
    setPendingTemplateUpload(null);
    setPreviewTemplate(null);
    setEditingTemplateFolderId(null);
    setOpenTemplateFolderMenuId(null);
  }

  function closeManagementPages() {
    closeTemplateLibraryModal();
    closeDatasetLibraryModal();
    closeFontLibraryModal();
  }

  function selectTemplateFolder(folderId: string) {
    setSelectedTemplateFolderId(folderId);
    setSelectedTemplateIds([]);
    setPendingTemplateUpload(null);
    setTemplateLibraryError("");
    setOpenTemplateFolderMenuId(null);
  }

  function createTemplateFolder(parentId: string | null) {
    if (!isAdmin) return;
    if (parentId) {
      const parentFolder = appState.templateFolders.find((folder) => folder.id === parentId);
      if (parentFolder?.parentId) {
        setTemplateLibraryError("Chỉ được tạo subfolder trong folder gốc");
        return;
      }
    }
    const nextFolder: TemplateFolder = {
      id: uid("folder"),
      name: "Thư mục mới",
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
    if (!name.trim()) renameTemplateFolder(folderId, "Thư mục chưa đặt tên");
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
      setTemplateLibraryError("Phải giữ lại ít nhất 1 folder");
      setOpenTemplateFolderMenuId(null);
      return;
    }
    const folderIdsToDelete = collectTemplateFolderIds(folderId);
    if (folderIdsToDelete.size >= appState.templateFolders.length) {
      setTemplateLibraryError("Không thể xóa toàn bộ folder");
      setOpenTemplateFolderMenuId(null);
      return;
    }
    const folderName =
      appState.templateFolders.find((folder) => folder.id === folderId)?.name || "folder này";
    if (!window.confirm(`Xóa "${folderName}" và toàn bộ folder con, ảnh bên trong?`)) {
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
        templateImages: current.templateImages.filter(
          (item) => !folderIdsToDelete.has(item.folderId)
        )
      };
    });
    setSelectedTemplateFolderId(fallbackFolderId);
    setSelectedPickerFolderId(fallbackFolderId);
    setSelectedTemplateIds([]);
    setPendingTemplateUpload(null);
    setEditingTemplateFolderId(null);
    setOpenTemplateFolderMenuId(null);
    setTemplateLibraryError("");
  }

  function openTemplatePickerModal() {
    setShowTemplatePickerModal(true);
    setSelectedPickerFolderId(activeTemplateFolderId);
    setSelectedPickerTemplateId(null);
  }

  function closeTemplatePickerModal() {
    setShowTemplatePickerModal(false);
    setSelectedPickerTemplateId(null);
  }

  function applyTemplateImageToCurrentTemplate(templateId: string) {
    const sourceTemplate = appState.templateImages.find((item) => item.id === templateId);
    if (!sourceTemplate || !getTemplateLibraryImage(sourceTemplate)) return;
    updateTemplate((current) => ({
      ...current,
      width: sourceTemplate.width,
      height: sourceTemplate.height,
      backgroundDataUrl: getTemplateLibraryImage(sourceTemplate),
      updatedAt: new Date().toISOString()
    }));
    setZoomLevel(1);
    closeTemplatePickerModal();
  }

  function removeCurrentTemplateImage() {
    if (!template.backgroundDataUrl) return;
    updateTemplate((current) => ({
      ...current,
      backgroundDataUrl: "",
      updatedAt: new Date().toISOString()
    }));
  }

  async function prepareTemplateUpload(file: File | undefined) {
    if (!file || !isAdmin) return;
    const dataUrl = await fileToDataUrl(file);
    const image = await loadHtmlImage(dataUrl);
    setPendingTemplateUpload({
      name: file.name.replace(/\.[^.]+$/, "") || "Ảnh mẫu mới",
      dataUrl,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      file
    });
    setTemplateLibraryError("");
  }

  async function savePendingTemplateUpload() {
    if (!pendingTemplateUpload || !isAdmin) return;
    if (!selectedTemplateFolder) {
      setTemplateLibraryError("Vui lòng tạo hoặc chọn folder trước khi tải ảnh");
      return;
    }
    let assetUrl = pendingTemplateUpload.dataUrl;
    let width = pendingTemplateUpload.width;
    let height = pendingTemplateUpload.height;
    if (remoteSyncEnabledRef.current) {
      setIsUploadingAsset(true);
      try {
        const uploaded = await uploadAssetToCloudinary(pendingTemplateUpload.file, "image");
        assetUrl = uploaded.url;
        width = uploaded.width || width;
        height = uploaded.height || height;
      } catch (error) {
        setTemplateLibraryError(
          error instanceof Error ? error.message : "Không tải ảnh lên Cloudinary được"
        );
        setIsUploadingAsset(false);
        return;
      }
      setIsUploadingAsset(false);
    }
    const nextImage: TemplateImage = {
      id: uid("image"),
      name: pendingTemplateUpload.name.trim() || "Ảnh mẫu mới",
      folderId: activeTemplateFolderId,
      width,
      height,
      dataUrl: assetUrl,
      createdAt: new Date().toISOString()
    };
    setAppState((current) => ({
      ...current,
      templateImages: [nextImage, ...current.templateImages]
    }));
    setPendingTemplateUpload(null);
    setTemplateLibraryError("");
  }

  function activatePage(templateId: string) {
    const nextTemplate = appState.templates.find((item) => item.id === templateId);
    if (!nextTemplate) return;
    closeManagementPages();
    setShowSettingsMenu(false);
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
      folderId: currentState.templateFolders[0]?.id || DEFAULT_TEMPLATE_FOLDER_ID,
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
    closeManagementPages();
    setShowSettingsMenu(false);
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

  function renameTemplateImage(imageId: string, name: string) {
    setAppState((current) => ({
      ...current,
      templateImages: current.templateImages.map((item) =>
        item.id === imageId ? { ...item, name } : item
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

  function openFontLibraryModal() {
    if (!isAdmin) return;
    setShowTemplateLibraryModal(false);
    setShowDatasetLibraryModal(false);
    setShowFontLibraryModal(true);
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
    setIsDataImportInline(true);
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

  function handleColumnDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!canEditWorkspace) return;
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
    if (!canEditWorkspace) return;
    if ("button" in event.evt && event.evt.button === 1) return;
    const isStageOrBackground =
      event.target === event.target.getStage() || event.target.name() === "background";
    if (!isStageOrBackground) return;
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
    if (activeCanvasTool !== "move") {
      setActiveCanvasTool("move");
    }
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

  if (!isAdmin && isAdminPath) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={handleAdminUnlock}>
          <div className="login-brand">
            <img src="https://eventci.vercel.app/favicon.ico" alt="" className="login-logo" />
            <div>
              <div className="login-brand-name">OneHousing</div>
              <div className="login-brand-sub">Công cụ tạo ảnh chỉ căn</div>
            </div>
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

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="side-brand">
          <img src="https://eventci.vercel.app/favicon.ico" alt="" className="brand-icon" />
          <div>
            <div className="brand-name">OneHousing</div>
            <div className="brand-sub">Công cụ tạo ảnh chỉ căn</div>
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
                  item.id === appState.activeTemplateId && !isManagementPageOpen
                    ? "page-row active"
                    : "page-row"
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

        {isAdmin ? (
          <div className="side-footer">
              <div
                ref={settingsMenuRef}
                className={showSettingsMenu ? "settings-menu-wrap open" : "settings-menu-wrap"}
              >
                <button
                  type="button"
                  className={showSettingsMenu ? "side-tab on" : "side-tab"}
                  aria-expanded={showSettingsMenu}
                  onClick={() => setShowSettingsMenu((current) => !current)}
                >
                  <Settings size={18} />
                  Cài đặt
                  <ChevronDown className="settings-tab-caret" size={16} />
                </button>
                <div className="settings-submenu" role="menu">
                  <button
                    type="button"
                    className="settings-subtab"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      openTemplateLibraryModal();
                    }}
                  >
                    <ImageUp size={17} />
                    Ảnh mẫu
                  </button>
                  <button
                    type="button"
                    className="settings-subtab"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      openDatasetLibraryModal();
                    }}
                  >
                    <FileSpreadsheet size={17} />
                    Dữ liệu
                  </button>
                  <button
                    type="button"
                    className="settings-subtab"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      openFontLibraryModal();
                    }}
                  >
                    <Type size={17} />
                    Phông chữ
                  </button>
                </div>
              </div>
              <button type="button" className="side-link" onClick={openAdminSettings}>
                <BadgeCheck size={16} />
                Đổi mật khẩu
              </button>
              <button className="side-link" type="button" onClick={logoutAdmin}>
                <LogOut size={18} />
                Đăng xuất
              </button>
          </div>
        ) : null}
      </aside>

      <main className="main-panel">
        <header className="admin-header">
          <div className="admin-header-main">
            <p className="page-size-title">
              {template.name} · {template.width} x {template.height}px
            </p>
          </div>
          <div className={`cloud-sync-pill ${cloudSync.status}`}>
            <Save size={15} />
            {cloudSync.message}
          </div>
        </header>

        {storageWarning ? <div className="storage-warning">{storageWarning}</div> : null}

        <section className="workspace-grid">
          <section className="left-panel panel">
            <div className="panel-head">
              <div>
                <h2>Dữ liệu căn</h2>
                <p>
                  {hasSelectedDataset
                    ? `${dataset.rows.length} dòng · ${dataset.columns.length} cột`
                    : "Chưa chọn bộ dữ liệu"}
                </p>
              </div>
              <Columns3 size={20} />
            </div>

            <div className="form-group">
              <label>Thêm ảnh</label>
              {template.backgroundDataUrl ? (
                <div className="selected-template-preview">
                  <img src={template.backgroundDataUrl} alt={template.name} />
                  <button
                    type="button"
                    className="selected-template-delete"
                    title="Bỏ ảnh hiện tại"
                    aria-label="Bỏ ảnh hiện tại"
                    onClick={removeCurrentTemplateImage}
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="button"
                    className="selected-template-change"
                    onClick={openTemplatePickerModal}
                  >
                    Thay ảnh
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn full"
                  onClick={openTemplatePickerModal}
                >
                  <ImageUp size={18} />
                  Thêm ảnh
                </button>
              )}
            </div>

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
                  <label>Mã căn</label>
                  <CustomSelect
                    value={String(selectedRowIndex)}
                    options={dataset.rows.map((row, index) => ({
                      value: String(index),
                      label: row[dataset.keyColumn] || `Dòng ${index + 1}`
                    }))}
                    onChange={(nextValue) => setSelectedRowIndex(Number(nextValue))}
                    searchable
                    searchPlaceholder="Tìm mã căn"
                  />
                </div>

                <div className="column-section">
                  <div className="section-label">Cột dữ liệu</div>
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
                        disabled={!canEditWorkspace}
                      >
                        <Plus size={14} />
                        {column}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </section>

          <section className="canvas-panel" ref={canvasWrapRef}>
            <div className="canvas-toolbar">
              <div className="canvas-toolbar-left">
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
              <div className="history-controls" aria-label="Hoàn tác và làm lại">
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
              </div>
              <div className="canvas-meta">
                {selectedRow?.[dataset.keyColumn] || "Xem trước"}
              </div>
            </div>

            <div
              ref={canvasShellRef}
              className={`canvas-shell ${activeCanvasTool}-tool${isCanvasPanning ? " panning" : ""}`}
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
                        fontStyle={layerFontStyleValue(layer)}
                        fill={layer.color}
                        align={layer.align}
                        lineHeight={layer.lineHeight}
                        letterSpacing={layer.letterSpacing}
                        draggable={canEditWorkspace && activeCanvasTool === "move"}
                        visible={inlineTextEditor?.layerId !== layer.id}
                        onMouseDown={(event) => selectLayerFromCanvas(layer.id, event)}
                        onTap={(event) => selectLayerFromCanvas(layer.id, event)}
                        onDblClick={(event) => beginInlineFreeTextEdit(layer, event)}
                        onDblTap={(event) => beginInlineFreeTextEdit(layer, event)}
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
                      visible={activeCanvasTool === "move" && !inlineTextEditor}
                      rotateEnabled={false}
                      enabledAnchors={["middle-left", "middle-right"]}
                      borderStroke={selectedOutlineColor}
                      anchorStroke={selectedOutlineColor}
                      anchorFill="#ffffff"
                      boundBoxFunc={(oldBox, newBox) =>
                        newBox.width < 80 ? oldBox : newBox
                      }
                    />
                  </Layer>
                  </Stage>
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
                className="canvas-tools floating-canvas-tools"
                aria-label="Công cụ canvas"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerMove={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
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
                  disabled={!canAddTextLayer}
                >
                  <Type size={18} />
                  <span>Text</span>
                </button>
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
                        disabled={!canEditWorkspace}
                        onClick={() => alignSelectedLayers("horizontal", "start")}
                      >
                        <AlignHorizontalJustifyStart size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn giữa ngang"
                        disabled={!canEditWorkspace}
                        onClick={() => alignSelectedLayers("horizontal", "center")}
                      >
                        <AlignHorizontalJustifyCenter size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn phải"
                        disabled={!canEditWorkspace}
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
                        disabled={!canEditWorkspace}
                        onClick={() => alignSelectedLayers("vertical", "start")}
                      >
                        <AlignVerticalJustifyStart size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn giữa dọc"
                        disabled={!canEditWorkspace}
                        onClick={() => alignSelectedLayers("vertical", "center")}
                      >
                        <AlignVerticalJustifyCenter size={18} />
                      </button>
                      <button
                        type="button"
                        className="align-btn"
                        title="Căn dưới"
                        disabled={!canEditWorkspace}
                        onClick={() => alignSelectedLayers("vertical", "end")}
                      >
                        <AlignVerticalJustifyEnd size={18} />
                      </button>
                    </div>
                    <div className="alignment-actions">
                      <button
                        type="button"
                        className="align-action"
                        disabled={!canEditWorkspace}
                        onClick={tidySelectedLayers}
                      >
                        <Rows3 size={17} />
                        Dọn đều
                      </button>
                      <button
                        type="button"
                        className="align-action"
                        disabled={!canEditWorkspace || selectedLayers.length < 3}
                        onClick={() => distributeSelectedLayers("vertical")}
                      >
                        <Rows3 size={17} />
                        Dàn đều dọc
                      </button>
                      <button
                        type="button"
                        className="align-action"
                        disabled={!canEditWorkspace || selectedLayers.length < 3}
                        onClick={() => distributeSelectedLayers("horizontal")}
                      >
                        <Columns3 size={17} />
                        Dàn đều ngang
                      </button>
                    </div>
                  </div>
                ) : null}
                {typeof selectedLayer.content === "string" ? (
                  <div className="form-group">
                    <label>Nội dung text</label>
                    <textarea
                      rows={3}
                      value={selectedLayer.content}
                      disabled={!canEditWorkspace || hasMultiSelection}
                      onChange={(event) =>
                        updateSelectedLayer({
                          content: event.target.value,
                          name: event.target.value.trim() || "Free text"
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Gắn cột</label>
                    <CustomSelect
                      value={selectedLayer.column}
                      disabled={!canEditWorkspace || hasMultiSelection}
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
                )}

                <div className="form-group">
                  <label>Tên font</label>
                  <CustomSelect
                    value={selectedLayer.fontFamily}
                    disabled={!canEditWorkspace}
                    options={availableFonts.map((font) => ({
                      value: font,
                      label: font
                    }))}
                    onChange={(nextValue) => updateSelectedLayer({ fontFamily: nextValue })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Font type</label>
                    <CustomSelect
                      value={`${selectedLayer.fontWeight}|${selectedLayer.fontStyle || "normal"}`}
                      disabled={!canEditWorkspace}
                      options={selectedFontStyleOptions}
                      onChange={(nextValue) => {
                        const [fontWeight, fontStyle] = nextValue.split("|");
                        updateSelectedLayer({
                          fontWeight: fontWeight || "400",
                          fontStyle: fontStyle === "italic" ? "italic" : "normal"
                        });
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Size</label>
                    <input
                      type="number"
                      min={8}
                      max={220}
                      value={selectedLayer.fontSize}
                      disabled={!canEditWorkspace}
                      onChange={(event) =>
                        updateSelectedLayer({ fontSize: Number(event.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Màu sắc</label>
                  <HexColorInput
                    value={selectedLayer.color}
                    disabled={!canEditWorkspace}
                    onChange={(nextValue) => updateSelectedLayer({ color: nextValue })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Độ rộng</label>
                    <input
                      type="number"
                      min={80}
                      value={Math.round(selectedLayer.width)}
                      disabled={!canEditWorkspace}
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
                      disabled={!canEditWorkspace}
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
                        disabled={!canEditWorkspace}
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
                        disabled={!canEditWorkspace}
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
                  disabled={!canEditWorkspace}
                  onClick={removeSelectedLayer}
                >
                  <X size={18} />
                  {hasMultiSelection ? "Xóa nhóm lớp" : "Xóa lớp"}
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <TextCursorInput size={26} />
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
                  <span>Folder</span>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Tạo folder"
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
                      <Folder size={16} />
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
                          title="Tên folder"
                        />
                      ) : (
                        <span className="template-folder-name">{folder.name}</span>
                      )}
                      <div className="template-folder-menu-wrap">
                        <button
                          type="button"
                          className="template-folder-menu-btn"
                          title="Tùy chọn folder"
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
                              Xóa folder
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
                    <h3>{selectedTemplateFolder?.name || "Folder"}</h3>
                    <p>
                      {selectedFolderChildren.length} folder con · {templatesInSelectedFolder.length} ảnh
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
                        Tạo folder con
                      </button>
                    ) : null}
                    <label className={selectedTemplateFolder ? "btn blue" : "btn blue disabled"}>
                      <ImageUp size={18} />
                      Tải ảnh vào folder
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!selectedTemplateFolder}
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
                        <Folder size={18} />
                        {folder.name}
                      </button>
                    ))}
                  </div>
                ) : null}

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
                          disabled={isUploadingAsset}
                          onClick={savePendingTemplateUpload}
                        >
                          Lưu ảnh
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
                          <img src={getTemplateLibraryImage(item)} alt={item.name} />
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

            <div className="template-library-layout">
              <aside className="template-folder-pane">
                <div className="template-folder-head">
                  <span>Folder</span>
                </div>
                <div className="template-folder-list">
                  {flattenedTemplateFolders.map((folder) => (
                    <button
                      type="button"
                      key={folder.id}
                      className={
                        folder.id === activePickerFolderId
                          ? "template-folder-row active picker"
                          : "template-folder-row picker"
                      }
                      style={{ paddingLeft: 12 + folder.depth * 16 }}
                      onClick={() => {
                        setSelectedPickerFolderId(folder.id);
                        setSelectedPickerTemplateId(null);
                      }}
                    >
                      <Folder size={16} />
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="template-folder-content">
                <div className="template-current-folder-head">
                  <div>
                    <h3>
                      {appState.templateFolders.find((folder) => folder.id === activePickerFolderId)
                        ?.name || "Folder"}
                    </h3>
                    <p>{templatesInPickerFolder.length} ảnh</p>
                  </div>
                </div>

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
                          <img src={getTemplateLibraryImage(item)} alt={item.name} />
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
                <img src={getTemplateLibraryImage(previewTemplate)} alt={previewTemplate.name} />
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
