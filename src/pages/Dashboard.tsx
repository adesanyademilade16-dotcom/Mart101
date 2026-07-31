import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Plus, Trash2, Upload, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ConfirmModal from "@/components/ConfirmModal";
import ConditionBadge from "@/components/ConditionBadge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/categories";
import { PRODUCT_CONDITIONS, isUsedCondition } from "@/lib/conditions";
import { sanitizeError } from "@/lib/errors";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category: string;
  condition: string;
}

const MAX_PRICE = 1000000;

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraFilesInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "", category: "", condition: "", defectsDescription: "", paymentType: "", deliveryTimeframe: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const isUsed = isUsedCondition(newProduct.condition);
  const totalImages = (selectedFile ? 1 : 0) + extraFiles.length;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      setProfile(profileData);

      // OAuth users (e.g. Google) won't have WhatsApp/department/level yet — send them to onboarding.
      if (
        profileData &&
        (!profileData.whatsapp_number || !profileData.department || !profileData.level)
      ) {
        navigate("/complete-profile");
        return;
      }

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", session.user.id)
        .order("created_at", { ascending: false });
      setProducts(productsData || []);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const validateImageFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, WebP, and GIF images are allowed.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File must be under ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateImageFile(file);
      if (error) {
        setImageError(error);
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setImageError(null);
    }
  };

  const handleExtraFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const invalidFile = files.find((f) => validateImageFile(f) !== null);
    if (invalidFile) {
      setImageError(validateImageFile(invalidFile)!);
      return;
    }
    const maxExtra = isUsed ? 3 : 4; // used: 4 total (1 main + 3 extra), new: 5 total
    const combined = [...extraFiles, ...files].slice(0, maxExtra);
    setExtraFiles(combined);
    setExtraPreviews(combined.map((f) => URL.createObjectURL(f)));
    setImageError(null);
  };

  const removeExtraImage = (index: number) => {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index));
    setExtraPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const minImages = 1;
  const maxImages = isUsed ? 4 : 5;
  const isFormValid =
    selectedFile !== null &&
    newProduct.name.trim() !== "" &&
    newProduct.price !== "" &&
    newProduct.category !== "" &&
    newProduct.condition !== "" &&
    newProduct.paymentType !== "" &&
    newProduct.description.trim().length >= 10 &&
    totalImages >= minImages;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let hasError = false;
    if (!selectedFile) {
      setImageError("Please upload at least one product image before submitting.");
      hasError = true;
    }
    if (totalImages < 1) {
      setImageError("Please upload at least one product image.");
      hasError = true;
    }
    if (newProduct.description.trim().length < 10) {
      setDescriptionError("Please add a proper product description.");
      hasError = true;
    }
    if (newProduct.description.trim().length > 2000) {
      setDescriptionError("Description must be under 2,000 characters.");
      hasError = true;
    }
    if (hasError) return;

    const price = parseFloat(newProduct.price);
    if (price > MAX_PRICE) {
      toast({ title: "Price too high", description: `Maximum listing price is ₦${MAX_PRICE.toLocaleString()}.`, variant: "destructive" });
      return;
    }

    if (profile?.suspended) {
      toast({ title: "Account suspended", description: "You are not allowed to upload products.", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Upload main image
    let imageUrl: string | null = null;
    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, selectedFile);
      if (uploadError) {
        toast({ title: "Upload failed", description: sanitizeError(uploadError), variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }

    // Upload extra images
    const extraUrls: string[] = [];
    for (const file of extraFiles) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
      if (uploadError) continue;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      extraUrls.push(urlData.publicUrl);
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        name: newProduct.name,
        price,
        description: newProduct.description,
        image_url: imageUrl,
        category: newProduct.category,
        condition: newProduct.condition,
        defects_description: isUsed ? newProduct.defectsDescription || null : null,
        extra_image_urls: extraUrls.length > 0 ? extraUrls : null,
        payment_type: newProduct.paymentType,
        delivery_timeframe: newProduct.deliveryTimeframe.trim() || null,
      })
      .select()
      .single();

    setUploading(false);

    if (error) {
      toast({ title: "Error", description: sanitizeError(error), variant: "destructive" });
    } else {
      setProducts([data, ...products]);
      setNewProduct({ name: "", price: "", description: "", category: "", condition: "", defectsDescription: "", paymentType: "", deliveryTimeframe: "" });
      setSelectedFile(null);
      setPreviewUrl(null);
      setExtraFiles([]);
      setExtraPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (extraFilesInputRef.current) extraFilesInputRef.current.value = "";
      toast({ title: "Product added!" });
    }
  };

  // Form dirty detection for beforeunload
  const isFormDirty = newProduct.name.trim() !== "" || newProduct.price !== "" || newProduct.description.trim() !== "" || selectedFile !== null;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isFormDirty]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteTarget.id);
    if (!error) {
      setProducts(products.filter((p) => p.id !== deleteTarget.id));
      toast({ title: "Product deleted" });
    }
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Seller Dashboard</h1>

        {profile?.suspended && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-destructive font-medium text-sm">Your account has been suspended. You cannot upload new products.</p>
          </div>
        )}

        {/* Add product form */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <Plus className="w-5 h-5 text-secondary" /> Add New Product
          </h2>
          <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            ⚠️ MART101 is strictly for student-related items within campus. Irrelevant listings may be removed.
          </p>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Blue Sneakers" />
              </div>
              <div>
                <Label htmlFor="productPrice">Price (₦) — Max ₦{MAX_PRICE.toLocaleString()}</Label>
                <Input id="productPrice" type="number" min="0" max={MAX_PRICE} step="0.01" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} placeholder="5000" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productCategory">Category <span className="text-destructive">*</span></Label>
                <Select required value={newProduct.category} onValueChange={(val) => setNewProduct({ ...newProduct, category: val })}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="productCondition">Condition <span className="text-destructive">*</span></Label>
                <Select required value={newProduct.condition} onValueChange={(val) => setNewProduct({ ...newProduct, condition: val })}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentType">Payment Type <span className="text-destructive">*</span></Label>
                <Select required value={newProduct.paymentType} onValueChange={(val) => setNewProduct({ ...newProduct, paymentType: val })}>
                  <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pay on Delivery">Pay on Delivery</SelectItem>
                    <SelectItem value="Pre-order">Pre-order</SelectItem>
                    <SelectItem value="Flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
                {newProduct.paymentType === "Pre-order" && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-start gap-1">
                    <span>⚠️</span> Only use pre-order if you are trustworthy. Failure to deliver after payment may lead to account suspension.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="deliveryTimeframe">Delivery Timeframe (optional)</Label>
                <Select value={newProduct.deliveryTimeframe} onValueChange={(val) => setNewProduct({ ...newProduct, deliveryTimeframe: val })}>
                  <SelectTrigger><SelectValue placeholder="Select timeframe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Same day">Same day</SelectItem>
                    <SelectItem value="1–3 days">1–3 days</SelectItem>
                    <SelectItem value="3–7 days">3–7 days</SelectItem>
                    <SelectItem value="1–2 weeks">1–2 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="productDescription">Product Description (min 10 characters)</Label>
              <Textarea id="productDescription" required value={newProduct.description} onChange={(e) => { setNewProduct({ ...newProduct, description: e.target.value }); if (e.target.value.trim().length >= 10) setDescriptionError(null); }} placeholder={"HP ProBook 11 G2 x360 EE\nIntel Core m3 – 7th Gen\n128GB SSD | 4GB RAM\nTouchscreen ✅"} className={`min-h-[120px] ${descriptionError ? "border-destructive ring-destructive" : ""}`} />
              {descriptionError && <p className="text-sm text-destructive mt-1">{descriptionError}</p>}
            </div>

            {/* Defects field for used items */}
            {isUsed && (
              <div>
                <Label htmlFor="defectsDescription">Describe any defects or issues (optional but recommended)</Label>
                <Textarea
                  id="defectsDescription"
                  value={newProduct.defectsDescription}
                  onChange={(e) => setNewProduct({ ...newProduct, defectsDescription: e.target.value })}
                  placeholder="e.g. Minor scratch on the back cover, battery holds 4hrs..."
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Main image */}
            <div>
              <Label>Product Image <span className="text-destructive">*</span></Label>
              {isUsed && (
                <p className="text-xs text-amber-400 mb-2">📸 Upload clear real pictures of the actual item. Max 4 images for used items.</p>
              )}
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-secondary transition-colors ${imageError ? "border-destructive" : "border-border"}`}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="w-8 h-8 mb-2" />
                    <span>Click to upload main image</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
              {imageError && <p className="text-sm text-destructive mt-1">{imageError}</p>}
            </div>

            {/* Extra images */}
            {selectedFile && (
              <div>
                <Label>Additional Images {isUsed && <span className="text-destructive">*</span>}</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {extraPreviews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={url} alt={`Extra ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
                      <button type="button" onClick={() => removeExtraImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                  {extraFiles.length < (isUsed ? 3 : 4) && (
                    <div onClick={() => extraFilesInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-secondary transition-colors">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <input ref={extraFilesInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtraFilesSelect} />
                <p className="text-xs text-muted-foreground mt-1">{totalImages} of {isUsed ? "4 max" : "5 max"} images</p>
              </div>
            )}

            <Button type="submit" variant="secondary" className="font-semibold" disabled={uploading || profile?.suspended || !isFormValid}>
              {uploading ? "Uploading..." : "Add Product"}
            </Button>
          </form>
        </div>

        {/* My Products */}
        <h2 className="text-xl font-semibold text-foreground mb-4">My Products</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">You haven't listed any products yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="glass-card overflow-hidden">
                <div className="aspect-square bg-muted">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                      <p className="text-secondary font-bold">₦{Number(product.price).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ id: product.id, name: product.name })} className="text-destructive hover:text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <ConditionBadge condition={product.condition || "Brand New"} className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Product"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default Dashboard;
