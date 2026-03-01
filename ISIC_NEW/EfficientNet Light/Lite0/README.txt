Model data_config: {'input_size': (3, 224, 224), 'interpolation': 'bicubic', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.875, 'crop_mode': 'center'}
counts: Counter({5: 4827, 4: 802, 2: 791, 1: 370, 0: 235, 6: 102, 3: 83})
class weights: tensor([ 4.3830,  2.7838,  1.3021, 12.4096,  1.2843,  0.2134, 10.0980])
Device: cuda
Saving checkpoints to: /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432

=== PHASE A: Head-Warmup ===
[Warmup] Epoch 01 | train_loss 2.4379 acc 0.354 | val_loss 1.7210 acc 0.522
[Warmup] Epoch 02 | train_loss 1.9474 acc 0.465 | val_loss 1.5016 acc 0.579
[Warmup] Epoch 03 | train_loss 1.8760 acc 0.484 | val_loss 1.4722 acc 0.634

=== PHASE B: Fine-Tuning ===
Epoch 01 | train_loss 1.8392 acc 0.498 | val_loss 1.1740 acc 0.584
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 02 | train_loss 1.5814 acc 0.518 | val_loss 1.0870 acc 0.631
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 03 | train_loss 1.3744 acc 0.540 | val_loss 0.9707 acc 0.627
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 04 | train_loss 1.2500 acc 0.563 | val_loss 0.9294 acc 0.687
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 05 | train_loss 1.1638 acc 0.598 | val_loss 0.8184 acc 0.705
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 06 | train_loss 1.0612 acc 0.618 | val_loss 0.8516 acc 0.719
Epoch 07 | train_loss 1.0889 acc 0.611 | val_loss 0.8470 acc 0.749
Epoch 08 | train_loss 1.0371 acc 0.633 | val_loss 0.7571 acc 0.727
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 09 | train_loss 1.0105 acc 0.636 | val_loss 0.7656 acc 0.756
Epoch 10 | train_loss 0.9730 acc 0.641 | val_loss 0.7535 acc 0.759
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 11 | train_loss 0.9405 acc 0.650 | val_loss 0.6987 acc 0.755
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 12 | train_loss 0.9154 acc 0.666 | val_loss 0.6801 acc 0.744
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 13 | train_loss 0.9225 acc 0.662 | val_loss 0.7041 acc 0.770
Epoch 14 | train_loss 0.8922 acc 0.673 | val_loss 0.7648 acc 0.771
Epoch 15 | train_loss 0.8706 acc 0.684 | val_loss 0.7278 acc 0.717
Epoch 16 | train_loss 0.8091 acc 0.687 | val_loss 0.6925 acc 0.777
Epoch 17 | train_loss 0.7805 acc 0.712 | val_loss 0.7232 acc 0.790
Epoch 18 | train_loss 0.7409 acc 0.721 | val_loss 0.6509 acc 0.796
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 19 | train_loss 0.7229 acc 0.723 | val_loss 0.7155 acc 0.805
Epoch 20 | train_loss 0.7732 acc 0.713 | val_loss 0.7226 acc 0.791
Epoch 21 | train_loss 0.7213 acc 0.716 | val_loss 0.6680 acc 0.819
Epoch 22 | train_loss 0.6744 acc 0.730 | val_loss 0.6735 acc 0.810
Epoch 23 | train_loss 0.6987 acc 0.741 | val_loss 0.6851 acc 0.815
Epoch 24 | train_loss 0.6753 acc 0.741 | val_loss 0.6475 acc 0.808
✓ Updated BEST checkpoint -> /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt
Epoch 25 | train_loss 0.6555 acc 0.739 | val_loss 0.6780 acc 0.820

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432

Loaded checkpoint for eval: /content/drive/MyDrive/Lite0_Checkpoints/run_20260301_090432/efficientnet_lite0_best.pt (epoch 24)

===== VALIDATION METRICS (Lite0) =====
Balanced Accuracy : 0.7868
Macro F1          : 0.6872
Weighted F1       : 0.8186

Confusion Matrix:
        akiec  bcc  bkl  df  mel    nv  vasc
akiec     41    6    8   1    2     0     1
bcc        4   83    0   3    1     1     1
bkl       14    7  150   3   16     8     0
df         6    0    0  14    0     0     0
mel        9    4   16   4  133    32     2
nv        12   28   45  20   89  1009     4
vasc       0    0    0   0    1     0    25

Classification Report:
               precision    recall  f1-score   support

       akiec      0.477     0.695     0.566        59
         bcc      0.648     0.892     0.751        93
         bkl      0.685     0.758     0.719       198
          df      0.311     0.700     0.431        20
         mel      0.550     0.665     0.602       200
          nv      0.961     0.836     0.894      1207
        vasc      0.758     0.962     0.847        26

    accuracy                          0.807      1803
   macro avg      0.627     0.787     0.687      1803
weighted avg      0.843     0.807     0.819      1803
