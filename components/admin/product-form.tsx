"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { productApi, validateProductImage } from "@/lib/api/products";
import { ApiError, errorMessage, isAuthorizationError } from "@/lib/api/client";
import { unitToApi } from "@/lib/api/mappers";
import { publishCatalogChange } from "@/lib/catalog-events";
import { ProductPhoto } from "@/components/product-photo";
import { AdminErrorState, AdminLoadingState, useAdminSession } from "./admin-session";
import { AdminShell } from "./admin-shell";
import type { Category, Product, ProductPayload, ProductUnit, UploadedProductImage } from "@/types/product";

const blank = { name: "", category: "fruit" as Category, price: "", unit: "кг" as ProductUnit, description: "", is_available: true, salePrice: "", displayOrder: "" };

export function ProductFormPage({ productId }: { productId?: string }) {
  const router = useRouter();
  const session = useAdminSession();
  const { status, logout } = session;
  const [form, setForm] = useState(blank);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [savedId, setSavedId] = useState<string | undefined>(productId);
  const [stage, setStage] = useState<"uploading" | "saving" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const uploaded = useRef<{ file: File; image: UploadedProductImage } | null>(null);
  const persistedId = useRef(productId);
  const busy = stage !== null;

  useEffect(() => {
    persistedId.current = productId; setSavedId(productId);
    setProduct(null); setFile(null); setRemoveImage(false); uploaded.current = null;
    setForm(blank); setFeedback(""); setErrors({});
  }, [productId]);
  useEffect(() => {
    if (!productId || status !== "authenticated") return;
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    productApi.get(productId, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setProduct(value); setFile(null); setRemoveImage(false); uploaded.current = null;
      setForm({ name: value.name, category: value.category, price: String(value.price), unit: value.unit, description: value.description || "", is_available: value.is_available, salePrice: value.salePrice ? String(value.salePrice) : "", displayOrder: String(value.displayOrder ?? 0) });
    }).catch(cause => { if (!controller.signal.aborted) { if (isAuthorizationError(cause)) logout(); else setLoadError(cause instanceof ApiError && cause.status === 404 ? "Производот не е пронајден." : errorMessage(cause)); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [productId, status, logout, revision]);
  useEffect(() => {
    if (file) { const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }
    setPreview(removeImage ? "" : product?.imageUrl || "");
  }, [file, product?.imageUrl, removeImage]);

  function change<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) { setForm(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: "" })); }
  function selectFile(selected?: File) {
    if (!selected) return;
    const error = validateProductImage(selected);
    if (error) { setErrors(old => ({ ...old, image: error })); if (inputRef.current) inputRef.current.value = ""; return; }
    setFile(selected); setRemoveImage(false); uploaded.current = null; setErrors(old => ({ ...old, image: "" })); setFeedback("");
  }
  function clearImage() {
    setFile(null); setRemoveImage(true); uploaded.current = null;
    if (inputRef.current) inputRef.current.value = "";
    setErrors(old => ({ ...old, image: "" }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || !session.token) return;
    const nextErrors: Record<string, string> = {};
    const price = Number(form.price), salePrice = form.salePrice ? Number(form.salePrice) : undefined;
    if (!form.name.trim()) nextErrors.name = "Внесете име на производот.";
    if (!form.price || !Number.isFinite(price) || price <= 0) nextErrors.price = "Цената мора да биде поголема од нула.";
    if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)) nextErrors.salePrice = "Акциската цена мора да биде поголема од нула и пониска од редовната цена.";
    if (form.displayOrder && (!Number.isInteger(Number(form.displayOrder)) || Number(form.displayOrder) < 0)) nextErrors.displayOrder = "Внесете цел број поголем или еднаков на нула.";
    if (file) { const error = validateProductImage(file); if (error) nextErrors.image = error; }
    if (errors.image) nextErrors.image = errors.image;
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    inFlight.current = true; setFeedback("");
    let saved = false;
    let fieldsSaved = false;
    try {
      setStage("saving");
      const payload: ProductPayload = {
        name: form.name.trim(), description: form.description.trim(), price,
        category: form.category,
        unit: unitToApi[form.unit], is_available: form.is_available,
        is_on_sale: salePrice !== undefined, sale_price: salePrice ?? null,
        sort_order: Number(form.displayOrder || 0),
      };
      const record = persistedId.current ? await productApi.update(persistedId.current, payload, session.token) : await productApi.create(payload, session.token);
      persistedId.current = record.id; setSavedId(record.id); setProduct(record); fieldsSaved = true; publishCatalogChange();
      if (file) {
        setStage("uploading");
        const image = uploaded.current?.file === file && uploaded.current.image.productId === record.id ? uploaded.current.image : await productApi.uploadImage(record.id, file);
        uploaded.current = { file, image };
        setStage("saving");
        await productApi.attachImage(image);
      } else if (removeImage && record.imagePath) {
        await productApi.clearImage(record.id);
      }
      saved = true; publishCatalogChange(); router.push("/admin/products");
    } catch (cause) {
      if (isAuthorizationError(cause)) session.logout();
      else setFeedback(`${fieldsSaved ? "Податоците за производот се зачувани, но промената на фотографијата не успеа. Повторниот обид ќе го користи истиот производ. " : ""}${errorMessage(cause)}`);
    } finally { if (!saved) { inFlight.current = false; setStage(null); } }
  }

  return <AdminShell><main className="admin-content">
    <div className="admin-breadcrumb">Администрација / Производи / {productId ? "Уреди" : "Нов производ"}</div>
    <div className="admin-title-row"><div><h1>{savedId ? "Уреди производ" : "Додај производ"}</h1><p>Изберете фотографија од вашиот уред. Прикачувањето се врши при зачувување.</p></div></div>
    {loading ? <AdminLoadingState message="Се вчитува производот..."/> : loadError ? <AdminErrorState message={loadError} retry={() => setRevision(value => value + 1)}/> : <form className="admin-form" onSubmit={submit} noValidate>
      {feedback && <div className="admin-error-state" role="alert">{feedback}</div>}
      <fieldset className="product-form-fields" disabled={busy}><div className="form-grid">
        <div className="form-field"><label htmlFor="product-name">Име на производ *</label><input id="product-name" required value={form.name} onChange={event => change("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} placeholder="На пр. Портокал"/>{errors.name && <span className="form-error" id="name-error">{errors.name}</span>}</div>
        <div className="form-field"><label htmlFor="product-category">Категорија *</label><select id="product-category" value={form.category} onChange={event => change("category", event.target.value as Category)}><option value="fruit">Овошје</option><option value="vegetable">Зеленчук</option><option value="other">Други производи</option></select></div>
        <div className="form-field"><label htmlFor="product-price">Цена (ден) *</label><input id="product-price" required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.price} onChange={event => change("price", event.target.value)} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? "price-error" : undefined}/>{errors.price && <span className="form-error" id="price-error">{errors.price}</span>}</div>
        <div className="form-field"><label htmlFor="product-unit">Единица *</label><select id="product-unit" value={form.unit} onChange={event => change("unit", event.target.value as ProductUnit)}><option value="кг">ден/кг</option><option value="парче">ден/парче</option><option value="пакување">ден/пакување</option></select></div>
        <div className="form-field full"><label htmlFor="product-image">Фотографија на производот</label><div className="image-upload">
          <div className="upload-preview">{preview ? <ProductPhoto key={preview} src={preview} alt="Преглед на фотографијата"/> : <span className="upload-placeholder"><ImagePlus size={30}/><span>Изберете фотографија од вашиот уред</span></span>}</div>
          <div className="upload-controls"><input ref={inputRef} id="product-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => selectFile(event.target.files?.[0])} aria-invalid={Boolean(errors.image)} aria-describedby="image-help image-error"/><small id="image-help">JPEG, PNG или WebP · До 5 MB. Фотографијата се прикачува при зачувување.</small>{(preview || file || errors.image) && <button type="button" className="admin-button secondary" onClick={clearImage}><Trash2 size={14}/>Отстрани фотографија</button>}{removeImage && product?.imageUrl && <small>Постоечката фотографија ќе се отстрани кога ќе зачувате.</small>}</div>
        </div>{errors.image && <span className="form-error" id="image-error" role="alert">{errors.image}</span>}</div>
        <div className="form-field"><label htmlFor="product-sale">Акциска цена (по избор)</label><input id="product-sale" type="number" min="0.01" step="0.01" value={form.salePrice} onChange={event => change("salePrice", event.target.value)} aria-invalid={Boolean(errors.salePrice)} aria-describedby={errors.salePrice ? "sale-error" : undefined}/>{errors.salePrice && <span className="form-error" id="sale-error">{errors.salePrice}</span>}</div>
        <div className="form-field"><label htmlFor="product-order">Редослед на прикажување</label><input id="product-order" type="number" min="0" step="1" value={form.displayOrder} onChange={event => change("displayOrder", event.target.value)} aria-invalid={Boolean(errors.displayOrder)}/>{errors.displayOrder && <span className="form-error">{errors.displayOrder}</span>}</div>
        <div className="form-field full"><label htmlFor="product-description">Опис</label><textarea id="product-description" value={form.description} onChange={event => change("description", event.target.value)}/></div>
        <label className="checkbox-row form-field full"><input type="checkbox" checked={form.is_available} onChange={event => change("is_available", event.target.checked)}/>Достапен за купувачите</label>
        <div className="form-actions"><button type="button" className="admin-button secondary" onClick={() => router.push("/admin/products")}>{savedId ? "Назад кон производи" : "Откажи"}</button><button className="admin-button" type="submit">{busy && <LoaderCircle size={15} className="loading-spinner"/>}{stage === "uploading" ? "Се прикачува фотографијата..." : stage === "saving" ? "Се зачувува..." : savedId ? "Зачувај промени" : "Додај производ"}</button></div>
      </div></fieldset>
    </form>}
  </main></AdminShell>;
}
