# ============================================================
# ISIC 2019 (Kaggle) + PyTorch/timm — EfficientNet-Lite2
# Head-Warmup (3 Ep.) + Fine-Tuning (25 Ep.) + Metrics + Checkpoints (Option 1)
# Variant C: Save checkpoints automatically to Google Drive
# ============================================================

# -------------------- 0) Install deps --------------------
!pip -q install kaggle timm
!pip -q install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 || true
# CPU-only alternative:
# !pip -q install torch torchvision torchaudio

import os, glob, zipfile, json, random, datetime
import numpy as np, pandas as pd, torch, timm
from PIL import Image
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset, DataLoader
from collections import Counter

# -------------------- 0.5) Mount Google Drive (Colab) --------------------
from google.colab import drive
drive.mount('/content/drive')

# -------------------- 1) Repro --------------------
SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# -------------------- 2) Kaggle credentials --------------------
# IMPORTANT: use a NEW key; do NOT share it
KAGGLE_USERNAME = "eliashab"
KAGGLE_KEY      = "KGAT_ed6c631b1caccff7493fabdfb8965498"  # <-- paste in Colab ONLY (avoid posting keys)

os.makedirs("/root/.kaggle", exist_ok=True)
with open("/root/.kaggle/kaggle.json", "w") as f:
    json.dump({"username": KAGGLE_USERNAME, "key": KAGGLE_KEY}, f)
!chmod 600 /root/.kaggle/kaggle.json

# -------------------- 3) Download dataset --------------------
DATASET = "salviohexia/isic-2019-skin-lesion-images-for-classification"
!kaggle datasets download -d {DATASET} -p /content --force

# -------------------- 4) Unzip --------------------
os.makedirs("/content/data", exist_ok=True)
zips = glob.glob("/content/*.zip")
print("ZIPs:", zips)
if not zips:
    raise FileNotFoundError("No ZIP found in /content. Kaggle download likely failed.")

for z in zips:
    with zipfile.ZipFile(z, "r") as f:
        f.extractall("/content/data")

print("\nCSV files:")
!find /content/data -type f -name "*.csv" | head -n 30
print("\nJPG sample:")
!find /content/data -type f -name "*.jpg" | head -n 10

# -------------------- 5) Locate ground-truth CSV --------------------
candidates = glob.glob("/content/data/**/ISIC_2019_Training_GroundTruth.csv", recursive=True)
if not candidates:
    candidates = [p for p in glob.glob("/content/data/**/*.csv", recursive=True)
                  if "ground" in os.path.basename(p).lower() and "truth" in os.path.basename(p).lower()]

print("\nGroundTruth candidates:", candidates[:5])
if not candidates:
    raise FileNotFoundError("Could not find ISIC_2019_Training_GroundTruth.csv in extracted files.")

GT_CSV = candidates[0]
print("Using GT CSV:", GT_CSV)

gt = pd.read_csv(GT_CSV)

# Determine image id column
if "image" in gt.columns:
    img_col = "image"
elif "image_id" in gt.columns:
    img_col = "image_id"
else:
    raise ValueError("Could not find image id column. Expected 'image' or 'image_id'.")

# Determine class columns (one-hot)
class_cols = [c for c in gt.columns if c != img_col]
if not class_cols:
    raise ValueError("No class columns found in ground truth CSV.")

gt["label"] = gt[class_cols].values.argmax(axis=1).astype(int)
classes = class_cols[:]
num_classes = len(classes)

print("\nClasses:", classes)
print("num_classes:", num_classes)

# -------------------- 6) Build image path index --------------------
jpgs = glob.glob("/content/data/**/*.jpg", recursive=True)
if not jpgs:
    raise FileNotFoundError("No .jpg images found under /content/data. Check dataset structure.")

id_to_path = {}
for p in jpgs:
    base = os.path.splitext(os.path.basename(p))[0]
    if base not in id_to_path:
        id_to_path[base] = p

gt["filepath"] = gt[img_col].map(id_to_path)
missing = gt["filepath"].isna().sum()
gt = gt.dropna(subset=["filepath"]).reset_index(drop=True)

print(f"\nAfter path matching: {len(gt)} rows (missing paths dropped: {missing})")
df = gt[["filepath", "label"]].copy()

# -------------------- 7) Train/Val split --------------------
train_df, val_df = train_test_split(
    df,
    test_size=0.2,
    random_state=SEED,
    stratify=df["label"]
)

# -------------------- 8) timm transforms --------------------
from timm.data import resolve_model_data_config, create_transform

def pick_model_name():
    preferred = ["efficientnet_lite2", "tf_efficientnet_lite2"]
    available = set(timm.list_models("*lite2*"))
    for m in preferred:
        if m in available:
            return m
    return "efficientnet_lite2"

model_name = "tf_efficientnet_lite2"
print("Using model_name:", model_name)

_dummy = timm.create_model(model_name, pretrained=True, num_classes=num_classes)
data_config = resolve_model_data_config(_dummy)
del _dummy

train_tfms = create_transform(
    **data_config,
    is_training=True,
    auto_augment="rand-m9-mstd0.5",
    re_prob=0.2, re_mode="pixel", re_count=1
)
val_tfms = create_transform(**data_config, is_training=False)
print("Model data_config:", data_config)

# -------------------- 9) Dataset/DataLoader --------------------
class CsvImageDataset(Dataset):
    def __init__(self, frame: pd.DataFrame, tfm):
        self.paths = frame["filepath"].tolist()
        self.labels = frame["label"].tolist()
        self.tfm = tfm

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, i):
        img = Image.open(self.paths[i]).convert("RGB")
        img = self.tfm(img)
        return img, self.labels[i]

train_ds = CsvImageDataset(train_df, train_tfms)
val_ds   = CsvImageDataset(val_df,   val_tfms)

BATCH = 16
nw = max(2, (os.cpu_count() or 4)//2)

train_loader = DataLoader(
    train_ds, batch_size=BATCH, shuffle=True,
    num_workers=nw, pin_memory=True, persistent_workers=(nw > 0)
)
val_loader = DataLoader(
    val_ds, batch_size=BATCH, shuffle=False,
    num_workers=nw, pin_memory=True, persistent_workers=(nw > 0)
)

# -------------------- 10) Class weights --------------------
counts = Counter(train_df["label"].tolist())
total = sum(counts.values())

weights_list = []
for i in range(num_classes):
    c = counts.get(i, 0)
    if c == 0:
        weights_list.append(0.0)
    else:
        weights_list.append(total / (num_classes * c))

weights = torch.tensor(weights_list, dtype=torch.float)
print("counts:", counts)
print("class weights:", weights)

# -------------------- 11) Device + Model --------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Device:", device)

model = timm.create_model(model_name, pretrained=True, num_classes=num_classes).to(device)
criterion = torch.nn.CrossEntropyLoss(weight=weights.to(device))
scaler = torch.amp.GradScaler('cuda', enabled=(device.type == "cuda"))

def run_epoch(loader, optimizer=None, train=True):
    model.train(train)
    total_loss, correct, n = 0.0, 0, 0
    for x, y in loader:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True, dtype=torch.long)

        if train and optimizer is not None:
            optimizer.zero_grad(set_to_none=True)

        with torch.amp.autocast('cuda', enabled=(device.type == "cuda")):
            logits = model(x)
            loss = criterion(logits, y)

        if train and optimizer is not None:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

        total_loss += float(loss) * x.size(0)
        correct += (logits.argmax(1) == y).sum().item()
        n += x.size(0)

    return total_loss / n, correct / n

# =========================
# PHASE A — HEAD-WARMUP
# =========================
for p in model.parameters():
    p.requires_grad = False

head_names = ('classifier', 'head', 'fc')
head_params = []
for n, p in model.named_parameters():
    if any(hn in n for hn in head_names):
        p.requires_grad = True
        head_params.append(p)

if not head_params:
    raise RuntimeError("Could not find classification head parameters (classifier/head/fc).")

optimizer_head = torch.optim.AdamW(head_params, lr=3e-4, weight_decay=1e-4)

WARMUP_EPOCHS = 3
print("\n=== PHASE A: Head-Warmup (Lite2) ===")
for epoch in range(1, WARMUP_EPOCHS + 1):
    tr_loss, tr_acc = run_epoch(train_loader, optimizer=optimizer_head, train=True)
    with torch.no_grad():
        va_loss, va_acc = run_epoch(val_loader, optimizer=None, train=False)

    print(f"[Warmup] Epoch {epoch:02d} | train_loss {tr_loss:.4f} acc {tr_acc:.3f} | "
          f"val_loss {va_loss:.4f} acc {va_acc:.3f}")

# =========================
# PHASE B — FINE-TUNING
# =========================
for p in model.parameters():
    p.requires_grad = True

backbone_params, head_params = [], []
for n, p in model.named_parameters():
    (head_params if any(hn in n for hn in head_names) else backbone_params).append(p)

optimizer = torch.optim.AdamW([
    {'params': backbone_params, 'lr': 1e-4, 'weight_decay': 1e-4},
    {'params': head_params,     'lr': 3e-4, 'weight_decay': 1e-4},
])

scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode="min", factor=0.5, patience=2
)

# ---- Variant C: Save checkpoints to Google Drive ----
run_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
save_dir = f"/content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_{run_id}"
os.makedirs(save_dir, exist_ok=True)
print("Saving checkpoints to:", save_dir)

best_val = float("inf")
EPOCHS = 25

print("\n=== PHASE B: Fine-Tuning (Lite2) ===")
for epoch in range(1, EPOCHS + 1):
    tr_loss, tr_acc = run_epoch(train_loader, optimizer=optimizer, train=True)
    with torch.no_grad():
        va_loss, va_acc = run_epoch(val_loader, optimizer=None, train=False)

    scheduler.step(va_loss)

    print(f"Epoch {epoch:02d} | train_loss {tr_loss:.4f} acc {tr_acc:.3f} | "
          f"val_loss {va_loss:.4f} acc {va_acc:.3f}")

    # Save every epoch checkpoint
    epoch_ckpt_path = os.path.join(save_dir, f"efficientnet_lite2_epoch_{epoch:02d}.pt")
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "scheduler_state_dict": scheduler.state_dict(),
            "scaler_state_dict": scaler.state_dict(),
            "classes": classes,
            "model_name": model_name,
            "data_config": data_config,
            "train_loss": tr_loss,
            "train_acc": tr_acc,
            "val_loss": va_loss,
            "val_acc": va_acc,
            "seed": SEED,
            "batch_size": BATCH,
        },
        epoch_ckpt_path
    )
    print(f"✓ Saved epoch checkpoint -> {epoch_ckpt_path}")

    # Additionally maintain a "best" checkpoint
    if va_loss < best_val:
        best_val = va_loss
        best_path = os.path.join(save_dir, "efficientnet_lite2_best.pt")
        torch.save(
            {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "scheduler_state_dict": scheduler.state_dict(),
                "scaler_state_dict": scaler.state_dict(),
                "classes": classes,
                "model_name": model_name,
                "data_config": data_config,
                "train_loss": tr_loss,
                "train_acc": tr_acc,
                "val_loss": va_loss,
                "val_acc": va_acc,
                "seed": SEED,
                "batch_size": BATCH,
            },
            best_path
        )
        print(f"✓ Updated BEST checkpoint -> {best_path}")

print("Classes:", classes)

# -------------------- 12) Evaluation & Metrics --------------------
from sklearn.metrics import (
    confusion_matrix, classification_report,
    balanced_accuracy_score, f1_score, average_precision_score
)

# Load best checkpoint (preferred). If not present, fall back to last epoch checkpoint.
best_ckpt_path = os.path.join(save_dir, "efficientnet_lite2_best.pt")
last_ckpt_path = os.path.join(save_dir, f"efficientnet_lite2_epoch_{EPOCHS:02d}.pt")

load_path = best_ckpt_path if os.path.exists(best_ckpt_path) else last_ckpt_path
if os.path.exists(load_path):
    ckpt = torch.load(load_path, map_location=device)

    # Recreate model safely and load weights
    model = timm.create_model(ckpt["model_name"], pretrained=False, num_classes=len(ckpt["classes"])).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    print(f"\nLoaded checkpoint for eval: {load_path} (epoch {ckpt.get('epoch')})")
else:
    print("\nNo checkpoint found – evaluating current model.")
    model.eval()

all_probs, all_preds, all_true = [], [], []
with torch.inference_mode():
    for x, y in val_loader:
        x = x.to(device, non_blocking=True)
        y = y.to(device, non_blocking=True, dtype=torch.long)
        logits = model(x)
        probs = torch.softmax(logits, dim=1)
        preds = probs.argmax(dim=1)
        all_probs.append(probs.cpu().numpy())
        all_preds.append(preds.cpu().numpy())
        all_true.append(y.cpu().numpy())

y_prob = np.concatenate(all_probs, axis=0)
y_pred = np.concatenate(all_preds, axis=0)
y_true = np.concatenate(all_true, axis=0)

bal_acc   = balanced_accuracy_score(y_true, y_pred)
macro_f1  = f1_score(y_true, y_pred, average="macro", zero_division=0)
weight_f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

cm = confusion_matrix(y_true, y_pred, labels=range(num_classes))
cm_df = pd.DataFrame(cm, index=classes, columns=classes)

print("\n===== VALIDATION METRICS (Lite2) =====")
print(f"Balanced Accuracy : {bal_acc:.4f}")
print(f"Macro F1          : {macro_f1:.4f}")
print(f"Weighted F1       : {weight_f1:.4f}")
print("\nConfusion Matrix:\n", cm_df)

# IMPORTANT FIX: ensure report includes all classes even if some have zero support in val
print("\nClassification Report:\n",
      classification_report(
          y_true, y_pred,
          labels=list(range(num_classes)),
          target_names=classes,
          digits=3,
          zero_division=0
      ))

# Optional: per-class PR-AUC (OvR)
y_true_ovr = np.eye(num_classes)[y_true]
pr_aucs = {cls: average_precision_score(y_true_ovr[:, i], y_prob[:, i])
           for i, cls in enumerate(classes)}
print("\nPer-class PR-AUC:")
for k in classes:
    print(f"{k:>28s}: {pr_aucs[k]:.3f}")

# -------- Save a final "export" checkpoint (same format as above) --------
final_export_path = os.path.join(save_dir, "efficientnet_lite2_final_export.pt")
torch.save(
    {
        "epoch": ckpt.get("epoch", EPOCHS) if "ckpt" in locals() else EPOCHS,
        "model_state_dict": model.state_dict(),
        "classes": classes,
        "model_name": model_name,
        "data_config": data_config,
        "seed": SEED,
        "batch_size": BATCH,
    },
    final_export_path
)
print(f"✓ Final export checkpoint saved -> {final_export_path}")

print("\nDONE. Checkpoints are in Google Drive at:")
print(save_dir)