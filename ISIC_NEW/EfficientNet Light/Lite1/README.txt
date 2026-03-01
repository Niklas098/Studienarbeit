Drive already mounted at /content/drive; to attempt to forcibly remount, call drive.mount("/content/drive", force_remount=True).
Images already exist.
Copying CSV...
JPG count: 9013
CSV exists: True -> /content/data/train.csv
CSV columns: ['image_id', 'dx', 'img_path']
CSV rows: 9013
img_path unresolved for 9013 rows -> building fallback index by image_id...
Samples after path resolution: 9013
num_classes: 7
classes: ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
Label counts (min/median/max): 103 463 6034
Split ok. Stratify used: True
Using model: tf_efficientnet_lite1
model.safetensors: 100%
 21.9M/21.9M [00:02<00:00, 14.3MB/s]
Model data_config: {'input_size': (3, 240, 240), 'interpolation': 'bicubic', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.882, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 2.3553 acc 0.381 | val_loss 1.7997 acc 0.507
[Warmup] Epoch 02 | train_loss 1.9381 acc 0.470 | val_loss 1.6460 acc 0.516
[Warmup] Epoch 03 | train_loss 1.8114 acc 0.502 | val_loss 1.5058 acc 0.612

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.7318 acc 0.503 | val_loss 1.3062 acc 0.652
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 02 | train_loss 1.4696 acc 0.541 | val_loss 1.0059 acc 0.681
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 03 | train_loss 1.2948 acc 0.563 | val_loss 0.9453 acc 0.688
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 04 | train_loss 1.1767 acc 0.592 | val_loss 0.8771 acc 0.743
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 05 | train_loss 1.1167 acc 0.594 | val_loss 0.8523 acc 0.724
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 06 | train_loss 1.0472 acc 0.626 | val_loss 0.8115 acc 0.735
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 07 | train_loss 1.0336 acc 0.628 | val_loss 0.7960 acc 0.700
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 08 | train_loss 1.0252 acc 0.630 | val_loss 0.7162 acc 0.759
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 09 | train_loss 1.0156 acc 0.640 | val_loss 0.7487 acc 0.732
Epoch 10 | train_loss 0.9547 acc 0.659 | val_loss 0.7384 acc 0.730
Epoch 11 | train_loss 0.9291 acc 0.645 | val_loss 0.7214 acc 0.788
Epoch 12 | train_loss 0.8438 acc 0.678 | val_loss 0.6819 acc 0.768
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 13 | train_loss 0.8198 acc 0.698 | val_loss 0.6849 acc 0.793
Epoch 14 | train_loss 0.8086 acc 0.690 | val_loss 0.6714 acc 0.781
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 15 | train_loss 0.7595 acc 0.698 | val_loss 0.7266 acc 0.786
Epoch 16 | train_loss 0.7665 acc 0.710 | val_loss 0.6347 acc 0.809
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 17 | train_loss 0.7809 acc 0.709 | val_loss 0.6217 acc 0.786
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt
Epoch 18 | train_loss 0.7471 acc 0.714 | val_loss 0.6977 acc 0.781
Epoch 19 | train_loss 0.7082 acc 0.718 | val_loss 0.6311 acc 0.809
Epoch 20 | train_loss 0.6843 acc 0.731 | val_loss 0.6858 acc 0.806
Epoch 21 | train_loss 0.6852 acc 0.736 | val_loss 0.6274 acc 0.792
Epoch 22 | train_loss 0.6624 acc 0.739 | val_loss 0.6771 acc 0.816
Epoch 23 | train_loss 0.6565 acc 0.749 | val_loss 0.6582 acc 0.835
Epoch 24 | train_loss 0.6263 acc 0.744 | val_loss 0.6329 acc 0.840
Epoch 25 | train_loss 0.5993 acc 0.746 | val_loss 0.6225 acc 0.832

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734

Loaded checkpoint for eval: /content/drive/MyDrive/Lite1_Checkpoints/run_20260227_062734/efficientnet_lite1_best.pt (epoch 17)

===== VALIDATION METRICS (Lite1) =====
Balanced Accuracy : 0.7935
Macro F1          : 0.6983
Weighted F1       : 0.8005

Confusion Matrix:
        akiec  bcc  bkl  df  mel   nv  vasc
akiec     47    3    7   0    1    1     0
bcc        5   81    0   1    3    1     2
bkl       13    5  145   2   22   11     0
df         5    2    0  13    0    0     0
mel        5    3   16   2  141   28     5
nv        14   17   54   9  141  965     7
vasc       0    0    0   0    0    0    26

Classification Report:
               precision    recall  f1-score   support

       akiec      0.528     0.797     0.635        59
         bcc      0.730     0.871     0.794        93
         bkl      0.653     0.732     0.690       198
          df      0.481     0.650     0.553        20
         mel      0.458     0.705     0.555       200
          nv      0.959     0.800     0.872      1207
        vasc      0.650     1.000     0.788        26

    accuracy                          0.786      1803
   macro avg      0.637     0.793     0.698      1803
weighted avg      0.834     0.786     0.800      1803
