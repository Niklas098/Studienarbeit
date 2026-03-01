   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 363.4/363.4 MB 4.8 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 13.8/13.8 MB 91.7 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 24.6/24.6 MB 98.5 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 883.7/883.7 kB 77.7 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 664.8/664.8 MB 2.5 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 211.5/211.5 MB 6.2 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 56.3/56.3 MB 45.5 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 127.9/127.9 MB 10.0 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 207.5/207.5 MB 6.7 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 21.1/21.1 MB 127.3 MB/s eta 0:00:00
Drive already mounted at /content/drive; to attempt to forcibly remount, call drive.mount("/content/drive", force_remount=True).
Dataset URL: https://www.kaggle.com/datasets/salviohexia/isic-2019-skin-lesion-images-for-classification
License(s): Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)
Downloading isic-2019-skin-lesion-images-for-classification.zip to /content
100% 9.09G/9.10G [00:31<00:00, 135MB/s]
100% 9.10G/9.10G [00:31<00:00, 307MB/s]
ZIPs: ['/content/isic-2019-skin-lesion-images-for-classification.zip']

CSV files:
/content/data/ISIC_2019_Training_Metadata.csv
/content/data/ISIC_2019_Training_GroundTruth.csv

JPG sample:
/content/data/MEL/ISIC_0027776.jpg
/content/data/MEL/ISIC_0057323.jpg
/content/data/MEL/ISIC_0069179.jpg
/content/data/MEL/ISIC_0064993.jpg
/content/data/MEL/ISIC_0056921.jpg
/content/data/MEL/ISIC_0014284_downsampled.jpg
/content/data/MEL/ISIC_0029780.jpg
/content/data/MEL/ISIC_0056632.jpg
/content/data/MEL/ISIC_0071726.jpg
/content/data/MEL/ISIC_0032782.jpg

GroundTruth candidates: ['/content/data/ISIC_2019_Training_GroundTruth.csv']
Using GT CSV: /content/data/ISIC_2019_Training_GroundTruth.csv

Classes: ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC', 'UNK']
num_classes: 9

After path matching: 25331 rows (missing paths dropped: 0)
Using model_name: tf_efficientnet_lite2
/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_auth.py:94: UserWarning: 
The secret `HF_TOKEN` does not exist in your Colab secrets.
To authenticate with the Hugging Face Hub, create a token in your settings tab (https://huggingface.co/settings/tokens), set it as secret in your Google Colab and restart your session.
You will be able to reuse this secret in all of your notebooks.
Please note that authentication is recommended but still optional to access public models or datasets.
  warnings.warn(
model.safetensors: 100%
 24.6M/24.6M [00:01<00:00, 15.5MB/s]
Model data_config: {'input_size': (3, 260, 260), 'interpolation': 'bicubic', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.89, 'crop_mode': 'center'}
counts: Counter({1: 10300, 0: 3618, 2: 2658, 4: 2099, 3: 694, 7: 502, 6: 202, 5: 191})
class weights: tensor([ 0.6223,  0.2186,  0.8471,  3.2443,  1.0727, 11.7882, 11.1463,  4.4852,
         0.0000])
Device: cuda

=== PHASE A: Head-Warmup (Lite2) ===
[Warmup] Epoch 01 | train_loss 2.2424 acc 0.368 | val_loss 1.7902 acc 0.504
[Warmup] Epoch 02 | train_loss 1.9085 acc 0.422 | val_loss 1.6985 acc 0.504
[Warmup] Epoch 03 | train_loss 1.8914 acc 0.430 | val_loss 1.5603 acc 0.504
Saving checkpoints to: /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812

=== PHASE B: Fine-Tuning (Lite2) ===
Epoch 01 | train_loss 1.6794 acc 0.455 | val_loss 1.2046 acc 0.562
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_01.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 02 | train_loss 1.4383 acc 0.518 | val_loss 1.0817 acc 0.611
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_02.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 03 | train_loss 1.3405 acc 0.530 | val_loss 0.9698 acc 0.643
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_03.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 04 | train_loss 1.2898 acc 0.555 | val_loss 0.9460 acc 0.641
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_04.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 05 | train_loss 1.2245 acc 0.564 | val_loss 0.9056 acc 0.673
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_05.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 06 | train_loss 1.1861 acc 0.581 | val_loss 0.9583 acc 0.679
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_06.pt
Epoch 07 | train_loss 1.1428 acc 0.589 | val_loss 0.8459 acc 0.662
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_07.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 08 | train_loss 1.1113 acc 0.603 | val_loss 0.8394 acc 0.691
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_08.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 09 | train_loss 1.0711 acc 0.613 | val_loss 0.8198 acc 0.694
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_09.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 10 | train_loss 1.0619 acc 0.621 | val_loss 0.8263 acc 0.684
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_10.pt
Epoch 11 | train_loss 1.0136 acc 0.632 | val_loss 0.7465 acc 0.714
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_11.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 12 | train_loss 0.9677 acc 0.643 | val_loss 0.8120 acc 0.713
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_12.pt
Epoch 13 | train_loss 0.9613 acc 0.649 | val_loss 0.7330 acc 0.723
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_13.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 14 | train_loss 0.9365 acc 0.647 | val_loss 0.7432 acc 0.760
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_14.pt
Epoch 15 | train_loss 0.9291 acc 0.656 | val_loss 0.7552 acc 0.734
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_15.pt
Epoch 16 | train_loss 0.9205 acc 0.655 | val_loss 0.6986 acc 0.763
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_16.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 17 | train_loss 0.8680 acc 0.665 | val_loss 0.6977 acc 0.743
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_17.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 18 | train_loss 0.8432 acc 0.680 | val_loss 0.7067 acc 0.755
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_18.pt
Epoch 19 | train_loss 0.8598 acc 0.679 | val_loss 0.6952 acc 0.739
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_19.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 20 | train_loss 0.8424 acc 0.679 | val_loss 0.7162 acc 0.763
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_20.pt
Epoch 21 | train_loss 0.8315 acc 0.685 | val_loss 0.6655 acc 0.781
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_21.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Epoch 22 | train_loss 0.7960 acc 0.693 | val_loss 0.6787 acc 0.769
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_22.pt
Epoch 23 | train_loss 0.7922 acc 0.694 | val_loss 0.6719 acc 0.764
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_23.pt
Epoch 24 | train_loss 0.7935 acc 0.693 | val_loss 0.6737 acc 0.774
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_24.pt
Epoch 25 | train_loss 0.7140 acc 0.711 | val_loss 0.6336 acc 0.777
✓ Saved epoch checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_epoch_25.pt
✓ Updated BEST checkpoint -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt
Classes: ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC', 'UNK']

Loaded checkpoint for eval: /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_best.pt (epoch 25)

===== VALIDATION METRICS (Lite2) =====
Balanced Accuracy : 0.7987
Macro F1          : 0.6955
Weighted F1       : 0.7840

Confusion Matrix:
       MEL    NV  BCC   AK  BKL  DF  VASC  SCC  UNK
MEL   578   146   29   38   73   7     2   31    0
NV    209  2082   70   18  127  29    20   20    0
BCC    14     8  560   33   12   2     6   30    0
AK      2     0   15  126   12   1     0   17    0
BKL    22    21   16   47  401   6     2   10    0
DF      0     1    2    2    0  40     0    3    0
VASC    1     0    0    0    0   0    50    0    0
SCC     3     0    4   12    7   0     0  100    0
UNK     0     0    0    0    0   0     0    0    0

Classification Report:
               precision    recall  f1-score   support

         MEL      0.697     0.639     0.667       904
          NV      0.922     0.809     0.862      2575
         BCC      0.805     0.842     0.823       665
          AK      0.457     0.728     0.561       173
         BKL      0.634     0.764     0.693       525
          DF      0.471     0.833     0.602        48
        VASC      0.625     0.980     0.763        51
         SCC      0.474     0.794     0.593       126
         UNK      0.000     0.000     0.000         0

    accuracy                          0.777      5067
   macro avg      0.565     0.710     0.618      5067
weighted avg      0.802     0.777     0.784      5067


Per-class PR-AUC:
                         MEL: 0.761
                          NV: 0.956
                         BCC: 0.897
                          AK: 0.634
                         BKL: 0.771
                          DF: 0.817
                        VASC: 0.972
                         SCC: 0.759
                         UNK: 0.000
✓ Final export checkpoint saved -> /content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812/efficientnet_lite2_final_export.pt

DONE. Checkpoints are in Google Drive at:
/content/drive/MyDrive/ISIC_Lite2_Checkpoints/run_20260227_055812
/usr/local/lib/python3.11/dist-packages/sklearn/metrics/_ranking.py:1033: UserWarning: No positive class found in y_true, recall is set to one for all thresholds.
  warnings.warn(