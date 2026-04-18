   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2.6/2.6 MB 22.6 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 363.4/363.4 MB 3.2 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 13.8/13.8 MB 171.3 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 24.6/24.6 MB 139.1 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 883.7/883.7 kB 91.6 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 664.8/664.8 MB 2.6 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 211.5/211.5 MB 12.7 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 56.3/56.3 MB 50.7 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 127.9/127.9 MB 21.4 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 207.5/207.5 MB 9.4 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 21.1/21.1 MB 145.0 MB/s eta 0:00:00
BASE_DIR : /content/data
IMG_ROOT : /content/data/train
CSV_PATH : /content/drive/MyDrive/train_data/train.csv
Drive already mounted at /content/drive; to attempt to forcibly remount, call drive.mount("/content/drive", force_remount=True).
Save dir: /content/drive/MyDrive/TinyViT_ISIC2020_latest
CSV columns: ['image_name', 'patient_id', 'sex', 'age_approx', 'anatom_site_general_challenge', 'diagnosis', 'benign_malignant', 'target']
CSV rows: 33126
     image_name  patient_id     sex  age_approx anatom_site_general_challenge  \
0  ISIC_2637011  IP_7279968    male        45.0                     head/neck   
1  ISIC_0015719  IP_3075186  female        45.0               upper extremity   
2  ISIC_0052212  IP_2842074  female        50.0               lower extremity   
3  ISIC_0068279  IP_6890425  female        45.0                     head/neck   
4  ISIC_0074268  IP_8723313  female        55.0               upper extremity   

  diagnosis benign_malignant  target  
0   unknown           benign       0  
1   unknown           benign       0  
2     nevus           benign       0  
3   unknown           benign       0  
4   unknown           benign       0  
Verwendete Spalten:
image_col  = image_name
target_col = target
patient_col= patient_id
Unique labels: [0, 1]
Bildindex aufgebaut: 10000 eindeutige Bild-IDs, 0 Dubletten
Fehlende Bildpfade: 23126
Beispiele fehlender Bilder:
      image_name  label
0   ISIC_2637011      0
1   ISIC_0015719      0
2   ISIC_0052212      0
5   ISIC_0074311      0
9   ISIC_0076262      0
10  ISIC_0076545      0
11  ISIC_0076742      0
12  ISIC_0076995      0
13  ISIC_0077472      0
14  ISIC_0077735      0
15  ISIC_0078703      0
16  ISIC_0078712      0
18  ISIC_0080512      0
19  ISIC_0080752      0
20  ISIC_0080817      0
21  ISIC_0081956      0
22  ISIC_0082348      0
24  ISIC_0082934      0
25  ISIC_0083035      0
26  ISIC_0084086      0
Klassenverteilung der fehlenden Bilder:
label
0    23126
Name: count, dtype: int64
Samples nach Pfadprüfung: 10000
Bildprüfung: 5000/10000
Bildprüfung: 10000/10000
Lesbare Bilder : 10000
Defekte Bilder : 0
Samples nach Lesbarkeitsprüfung: 10000
     image_name                              filepath  label    group_id  \
0  ISIC_0068279  /content/data/train/ISIC_0068279.jpg      0  IP_6890425   
1  ISIC_0074268  /content/data/train/ISIC_0074268.jpg      0  IP_8723313   
2  ISIC_0074542  /content/data/train/ISIC_0074542.jpg      0  IP_4698288   
3  ISIC_0075663  /content/data/train/ISIC_0075663.jpg      0  IP_6017204   
4  ISIC_0075914  /content/data/train/ISIC_0075914.jpg      0  IP_7622888   

   patient_id     sex  age_approx anatom_site_general_challenge diagnosis  \
0  IP_6890425  female        45.0                     head/neck   unknown   
1  IP_8723313  female        55.0               upper extremity   unknown   
2  IP_4698288    male        25.0               lower extremity   unknown   
3  IP_6017204  female        35.0                         torso   unknown   
4  IP_7622888    male        30.0                         torso   unknown   

  benign_malignant  target  
0           benign       0  
1           benign       0  
2           benign       0  
3           benign       0  
4           benign       0  
Klassenverteilung gesamt:
label
0    9416
1     584
Name: count, dtype: int64
Split: StratifiedGroupKFold
Train size: 7981
Val size  : 2019
Train class counts:
label
0    7521
1     460
Name: count, dtype: int64
Val class counts:
label
0    1895
1     124
Name: count, dtype: int64
Group overlap train/val: 0
data_config: {'input_size': (3, 224, 224), 'interpolation': 'bicubic', 'mean': (0.485, 0.456, 0.406), 'std': (0.229, 0.224, 0.225), 'crop_pct': 0.95, 'crop_mode': 'center'}
Verwendete Inputgröße: (3, 224, 224)
Resize-Interpolation: bicubic
Train positives: 460
Train negatives: 7521
base_pos_weight      = 16.3500
effective_pos_weight = 16.3500
USE_WEIGHTED_SAMPLER = False
Device: cuda
model.safetensors: 100%
 21.6M/21.6M [00:05<00:00, 4.03MB/s]

=== PHASE A: Head-Warmup ===

--- Warmup Epoch 1/3 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 42:06
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:07
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:33
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
[Warmup] Epoch 01 | train_loss 1.2395 acc 0.585 | val_loss 1.2109 acc 0.807 | val_ap 0.1893 | val_auc 0.7602 | val_bal 0.6893 | val_sens 0.6452 | val_spec 0.7335 | thr 0.47

--- Warmup Epoch 2/3 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 34:40
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:05
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:31
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
[Warmup] Epoch 02 | train_loss 1.1316 acc 0.724 | val_loss 1.1283 acc 0.741 | val_ap 0.2209 | val_auc 0.7932 | val_bal 0.7032 | val_sens 0.5726 | val_spec 0.8338 | thr 0.55

--- Warmup Epoch 3/3 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 36:48
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:05
[Train] Batch  125/125 |   0.38 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:23
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
[Warmup] Epoch 03 | train_loss 1.0770 acc 0.726 | val_loss 1.0830 acc 0.724 | val_ap 0.2331 | val_auc 0.8078 | val_bal 0.7023 | val_sens 0.5323 | val_spec 0.8723 | thr 0.60

=== PHASE B: Fine-Tuning ===

--- Finetune Epoch 1/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 40:03
[Train] Batch  100/125 |   0.36 batches/s | ETA 01:08
[Train] Batch  125/125 |   0.38 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.06 batches/s | ETA 09:08
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
Epoch 01 | train_loss 0.9814 acc 0.713 | val_loss 0.8703 acc 0.704 | val_ap 0.2984 | val_auc 0.8631 | val_bal 0.7839 | val_sens 0.7419 | val_spec 0.8259 | val_prec+ 0.2180 | val_f2+ 0.5011 | thr 0.71
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/TinyViT_ISIC2020_latest/tiny_vit_5m_224_in1k_best.pt

--- Finetune Epoch 2/25 ---
[Train] Batch    1/125 |   0.07 batches/s | ETA 28:43
[Train] Batch  100/125 |   0.36 batches/s | ETA 01:08
[Train] Batch  125/125 |   0.38 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:47
[Val] Batch   32/32 |   0.39 batches/s | ETA 00:00
Epoch 02 | train_loss 0.8264 acc 0.748 | val_loss 0.8191 acc 0.777 | val_ap 0.3849 | val_auc 0.8910 | val_bal 0.7916 | val_sens 0.6935 | val_spec 0.8897 | val_prec+ 0.2915 | val_f2+ 0.5436 | thr 0.64
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/TinyViT_ISIC2020_latest/tiny_vit_5m_224_in1k_best.pt

--- Finetune Epoch 3/25 ---
[Train] Batch    1/125 |   0.04 batches/s | ETA 47:42
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:08
[Train] Batch  125/125 |   0.38 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:36
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
Epoch 03 | train_loss 0.7378 acc 0.782 | val_loss 0.7939 acc 0.818 | val_ap 0.4042 | val_auc 0.8943 | val_bal 0.7672 | val_sens 0.6210 | val_spec 0.9135 | val_prec+ 0.3195 | val_f2+ 0.5224 | thr 0.66
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/TinyViT_ISIC2020_latest/tiny_vit_5m_224_in1k_best.pt

--- Finetune Epoch 4/25 ---
[Train] Batch    1/125 |   0.04 batches/s | ETA 51:30
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:06
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.06 batches/s | ETA 09:19
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
Epoch 04 | train_loss 0.7063 acc 0.790 | val_loss 0.7968 acc 0.704 | val_ap 0.3916 | val_auc 0.8941 | val_bal 0.7988 | val_sens 0.6935 | val_spec 0.9040 | val_prec+ 0.3209 | val_f2+ 0.5628 | thr 0.79

--- Finetune Epoch 5/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 36:04
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:07
[Train] Batch  125/125 |   0.38 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:37
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
Epoch 05 | train_loss 0.6487 acc 0.807 | val_loss 0.8730 acc 0.688 | val_ap 0.3333 | val_auc 0.8807 | val_bal 0.7931 | val_sens 0.7419 | val_spec 0.8443 | val_prec+ 0.2377 | val_f2+ 0.5210 | thr 0.83

--- Finetune Epoch 6/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 43:38
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:07
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:38
[Val] Batch   32/32 |   0.38 batches/s | ETA 00:00
Epoch 06 | train_loss 0.5976 acc 0.830 | val_loss 0.8905 acc 0.837 | val_ap 0.4141 | val_auc 0.8938 | val_bal 0.8208 | val_sens 0.8548 | val_spec 0.7868 | val_prec+ 0.2078 | val_f2+ 0.5268 | thr 0.31
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/TinyViT_ISIC2020_latest/tiny_vit_5m_224_in1k_best.pt

--- Finetune Epoch 7/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 38:34
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:08
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:44
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
Epoch 07 | train_loss 0.5944 acc 0.831 | val_loss 0.8301 acc 0.841 | val_ap 0.3850 | val_auc 0.8956 | val_bal 0.8098 | val_sens 0.7500 | val_spec 0.8697 | val_prec+ 0.2735 | val_f2+ 0.5562 | thr 0.57

--- Finetune Epoch 8/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 37:53
[Train] Batch  100/125 |   0.36 batches/s | ETA 01:10
[Train] Batch  125/125 |   0.38 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 10:01
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
Epoch 08 | train_loss 0.5233 acc 0.848 | val_loss 0.9779 acc 0.859 | val_ap 0.3368 | val_auc 0.8811 | val_bal 0.7627 | val_sens 0.6210 | val_spec 0.9045 | val_prec+ 0.2984 | val_f2+ 0.5106 | thr 0.59

--- Finetune Epoch 9/25 ---
[Train] Batch    1/125 |   0.04 batches/s | ETA 48:38
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:05
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:59
[Val] Batch   32/32 |   0.37 batches/s | ETA 00:00
Epoch 09 | train_loss 0.5352 acc 0.845 | val_loss 1.0240 acc 0.872 | val_ap 0.3998 | val_auc 0.8907 | val_bal 0.7921 | val_sens 0.7177 | val_spec 0.8665 | val_prec+ 0.2602 | val_f2+ 0.5310 | thr 0.43

--- Finetune Epoch 10/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 40:03
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:05
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:40
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
Epoch 10 | train_loss 0.3983 acc 0.898 | val_loss 0.9392 acc 0.870 | val_ap 0.4588 | val_auc 0.9049 | val_bal 0.7979 | val_sens 0.7419 | val_spec 0.8538 | val_prec+ 0.2493 | val_f2+ 0.5318 | thr 0.38
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/TinyViT_ISIC2020_latest/tiny_vit_5m_224_in1k_best.pt

--- Finetune Epoch 11/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 45:35
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:05
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:46
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
Epoch 11 | train_loss 0.2858 acc 0.927 | val_loss 1.2216 acc 0.892 | val_ap 0.4259 | val_auc 0.9042 | val_bal 0.8011 | val_sens 0.7177 | val_spec 0.8844 | val_prec+ 0.2890 | val_f2+ 0.5535 | thr 0.34

--- Finetune Epoch 12/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 35:04
[Train] Batch  100/125 |   0.38 batches/s | ETA 01:06
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 14:03
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
Epoch 12 | train_loss 0.2868 acc 0.925 | val_loss 1.4618 acc 0.919 | val_ap 0.4197 | val_auc 0.9014 | val_bal 0.8086 | val_sens 0.7581 | val_spec 0.8591 | val_prec+ 0.2604 | val_f2+ 0.5484 | thr 0.12

--- Finetune Epoch 13/25 ---
[Train] Batch    1/125 |   0.04 batches/s | ETA 48:23
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:08
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.04 batches/s | ETA 13:40
[Val] Batch   32/32 |   0.38 batches/s | ETA 00:00
Epoch 13 | train_loss 0.2794 acc 0.929 | val_loss 1.1039 acc 0.870 | val_ap 0.3104 | val_auc 0.8928 | val_bal 0.8053 | val_sens 0.7500 | val_spec 0.8607 | val_prec+ 0.2605 | val_f2+ 0.5451 | thr 0.36

--- Finetune Epoch 14/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 36:43
[Train] Batch  100/125 |   0.39 batches/s | ETA 01:04
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:38
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
Epoch 14 | train_loss 0.2289 acc 0.937 | val_loss 1.5410 acc 0.908 | val_ap 0.3725 | val_auc 0.9017 | val_bal 0.8052 | val_sens 0.7339 | val_spec 0.8765 | val_prec+ 0.2800 | val_f2+ 0.5542 | thr 0.13

--- Finetune Epoch 15/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 42:17
[Train] Batch  100/125 |   0.36 batches/s | ETA 01:08
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.06 batches/s | ETA 08:53
[Val] Batch   32/32 |   0.36 batches/s | ETA 00:00
Epoch 15 | train_loss 0.1633 acc 0.958 | val_loss 1.6257 acc 0.913 | val_ap 0.4055 | val_auc 0.9086 | val_bal 0.8029 | val_sens 0.7097 | val_spec 0.8960 | val_prec+ 0.3088 | val_f2+ 0.5634 | thr 0.15

--- Finetune Epoch 16/25 ---
[Train] Batch    1/125 |   0.04 batches/s | ETA 54:28
[Train] Batch  100/125 |   0.37 batches/s | ETA 01:07
[Train] Batch  125/125 |   0.39 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.06 batches/s | ETA 09:03
[Val] Batch   32/32 |   0.38 batches/s | ETA 00:00
Epoch 16 | train_loss 0.1433 acc 0.968 | val_loss 1.7046 acc 0.910 | val_ap 0.3900 | val_auc 0.9037 | val_bal 0.8220 | val_sens 0.8065 | val_spec 0.8375 | val_prec+ 0.2451 | val_f2+ 0.5531 | thr 0.04
Early stopping nach 16 Epochen.

Training abgeschlossen.
Checkpoints gespeichert in:
/content/drive/MyDrive/TinyViT_ISIC2020_latest

Loaded checkpoint for eval: /content/drive/MyDrive/TinyViT_ISIC2020_latest/tiny_vit_5m_224_in1k_best.pt (epoch 10)
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:36
[Val] Batch   32/32 |   0.38 batches/s | ETA 00:00

===== VALIDATION METRICS (tiny_vit_5m_224.in1k / ISIC2020) =====
Threshold           : 0.380
Val Loss            : 0.9392
Val Acc             : 0.8697
ROC-AUC             : 0.9049
PR-AUC / AP         : 0.4588
Balanced Accuracy   : 0.7979
Sensitivity         : 0.7419
Specificity         : 0.8538
Precision positive  : 0.2493
NPV                 : 0.9806
F1 positive         : 0.3732
F2 positive         : 0.5318
Macro F1            : 0.6430
Weighted F1         : 0.8797

Confusion Matrix:
          negative  positive
negative      1618       277
positive        32        92

Classification Report:
              precision    recall  f1-score   support

    negative      0.981     0.854     0.913      1895
    positive      0.249     0.742     0.373       124

    accuracy                          0.847      2019
   macro avg      0.615     0.798     0.643      2019
weighted avg      0.936     0.847     0.880      2019


Artefakte gespeichert:
- run_meta.json
- train_split.csv
- val_split.csv
- bad_images_removed.csv
- tiny_vit_5m_224_in1k_best.pt
- tiny_vit_5m_224_in1k_last.pt
- metrics_summary.json
- confusion_matrix.csv
- val_predictions.csv