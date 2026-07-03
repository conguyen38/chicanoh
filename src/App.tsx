import { useEffect, useMemo, useRef, useState } from "react";
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
  AlignLeft,
  AlignRight,
  BadgeCheck,
  Columns3,
  Download,
  FileSpreadsheet,
  ImageUp,
  Lock,
  LogOut,
  Maximize2,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  TextCursorInput,
  Type,
  WandSparkles,
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

const STORAGE_KEY = "oh-property-maker-state-v2";
const ADMIN_KEY = "oh-property-maker-admin-ok";
const DEFAULT_ADMIN_HASH =
  "704e2322e3ad3b2c05b77a00ba673175f07e5769a4ba011c101044054a1960a3";
const ADMIN_HASH = import.meta.env.VITE_ADMIN_CODE_HASH || DEFAULT_ADMIN_HASH;
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
    return {
      ...parsed,
      templates: parsed.templates.map((template) =>
        template.name === "OneHousing 4:5"
          ? { ...template, name: "Ảnh mẫu OneHousing" }
          : template
      )
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
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showDatasetLibraryModal, setShowDatasetLibraryModal] = useState(false);
  const [showDataImportModal, setShowDataImportModal] = useState(false);
  const [showTemplateLibraryModal, setShowTemplateLibraryModal] = useState(false);
  const [showFontLibraryModal, setShowFontLibraryModal] = useState(false);
  const [fontLibraryError, setFontLibraryError] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [datasetLibraryError, setDatasetLibraryError] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
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
  const [stageWidth, setStageWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
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
  const textRefs = useRef<Record<string, Konva.Text>>({});
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const isZoomShortcutPressedRef = useRef(false);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() === "z") {
        isZoomShortcutPressedRef.current = true;
      }
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
    const hash = await sha256(adminCode.trim());
    if (hash !== ADMIN_HASH) {
      setAdminError("Mã quản trị không đúng");
      return;
    }
    localStorage.setItem(ADMIN_KEY, "1");
    setIsAdmin(true);
    setAdminCode("");
    setShowAdminModal(false);
  }

  function logoutAdmin() {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
    setSelectedLayerIds([]);
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
    setAppState((current) => ({
      ...current,
      activeTemplateId: templateId
    }));
    setSelectedLayerIds(nextTemplate.layers[0] ? [nextTemplate.layers[0].id] : []);
    setZoomLevel(1);
    closeTemplateLibraryModal();
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

  function changeZoom(delta: number) {
    setZoomLevel((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2))))
    );
  }

  function handleCanvasWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!isZoomShortcutPressedRef.current) return;
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  function fitCanvasToFrame() {
    setZoomLevel(1);
  }

  async function exportImage(pixelRatio: 1 | 0.5, mimeType: "image/png" | "image/jpeg") {
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
      downloadDataUrl(
        dataUrl,
        `${getExportName(template, selectedRow, dataset.keyColumn)}_${pixelRatio === 1 ? "full" : "half"}.${ext}`
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

        <div className="side-section">
          <div className="side-section-title">Không gian</div>
          <button className="side-tab on" type="button">
            <WandSparkles size={20} />
            Studio căn
          </button>
        </div>

        <div className="side-footer">
          <div className={isAdmin ? "status-pill ok" : "status-pill"}>
            {isAdmin ? <BadgeCheck size={16} /> : <Lock size={16} />}
            {isAdmin ? "Quản trị" : "Nhân viên"}
          </div>
          {isAdmin ? (
            <button className="side-link" type="button" onClick={logoutAdmin}>
              <LogOut size={18} />
              Khóa quản trị
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
            {isAdmin ? (
              <button
                className="btn mobile-admin-inline"
                type="button"
                onClick={logoutAdmin}
              >
                <LogOut size={18} />
                Khóa quản trị
              </button>
            ) : (
              <button
                className="btn blue mobile-admin-inline"
                type="button"
                onClick={() => setShowAdminModal(true)}
              >
                <Lock size={18} />
                Mở quản trị
              </button>
            )}
          </div>
        </header>

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
              <select
                value={dataset.id}
                onChange={(event) =>
                  setAppState((current) => ({
                    ...current,
                    activeDatasetId: event.target.value
                  }))
                }
              >
                {appState.datasets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Mã căn</label>
              <select
                value={selectedRowIndex}
                onChange={(event) => setSelectedRowIndex(Number(event.target.value))}
              >
                {dataset.rows.map((row, index) => (
                  <option key={`${row[dataset.keyColumn]}_${index}`} value={index}>
                    {row[dataset.keyColumn] || `Dòng ${index + 1}`}
                  </option>
                ))}
              </select>
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
              className="canvas-shell"
              onWheel={handleCanvasWheel}
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
                    ) : (
                      <Rect
                        name="background"
                        x={0}
                        y={0}
                        width={template.width}
                        height={template.height}
                        fill="#f5f7fb"
                      />
                    )}

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
                        onTransformEnd={(event) => {
                          const node = event.target;
                          const nextWidth = Math.max(80, node.width() * node.scaleX());
                          node.scaleX(1);
                          updateTemplate((current) => ({
                            ...current,
                            updatedAt: new Date().toISOString(),
                            layers: current.layers.map((item) =>
                              item.id === layer.id
                                ? { ...item, width: Math.round(nextWidth) }
                                : item
                            )
                          }));
                        }}
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
                <div className="form-group">
                  <label>Gắn cột</label>
                  <select
                    value={selectedLayer.column}
                    disabled={!isAdmin || hasMultiSelection}
                    onChange={(event) =>
                      updateSelectedLayer({
                        column: event.target.value,
                        name: event.target.value
                      })
                    }
                  >
                    {dataset.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phông chữ</label>
                    <select
                      value={selectedLayer.fontFamily}
                      disabled={!isAdmin}
                      onChange={(event) => updateSelectedLayer({ fontFamily: event.target.value })}
                    >
                      {availableFonts.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Màu</label>
                    <input
                      type="color"
                      value={selectedLayer.color}
                      disabled={!isAdmin}
                      onChange={(event) => updateSelectedLayer({ color: event.target.value })}
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
                    <select
                      value={selectedLayer.fontWeight}
                      disabled={!isAdmin}
                      onChange={(event) => updateSelectedLayer({ fontWeight: event.target.value })}
                    >
                      <option value="400">400</option>
                      <option value="500">500</option>
                      <option value="600">600</option>
                      <option value="700">700</option>
                      <option value="800">800</option>
                    </select>
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
              <div className="export-grid">
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
                  onClick={() => exportImage(0.5, "image/png")}
                >
                  <Download size={18} />
                  PNG 1/2
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
                  JPG 1/2
                </button>
              </div>
            </div>

            <div className="admin-tools">
              <div className="section-label">Quản trị</div>
              <div className="form-group">
                <label>Cột khóa</label>
                <select
                  value={dataset.keyColumn}
                  disabled={!isAdmin}
                  onChange={(event) => setKeyColumn(event.target.value)}
                >
                  {dataset.columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn full"
                disabled={!isAdmin}
                onClick={resetLocalData}
              >
                <RefreshCw size={18} />
                Khôi phục mẫu
              </button>
            </div>
          </aside>
        </section>
      </main>

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
              <label htmlFor="admin-code-input">Mã quản trị</label>
              <input
                id="admin-code-input"
                autoFocus
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
                  <select
                    value={pendingDataset.keyColumn}
                    onChange={(event) =>
                      setPendingDataset((current) =>
                        current ? { ...current, keyColumn: event.target.value } : current
                      )
                    }
                  >
                    {pendingDataset.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
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
              <label className="btn">
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
                    <img src={item.backgroundDataUrl} alt={item.name} />
                    <button
                      type="button"
                      className="btn blue import-template-btn"
                      onClick={() => importTemplateToEditor(item.id)}
                    >
                      Import
                    </button>
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
