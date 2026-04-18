   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 363.4/363.4 MB 3.2 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 13.8/13.8 MB 108.1 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 24.6/24.6 MB 108.9 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 883.7/883.7 kB 78.0 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 664.8/664.8 MB 2.6 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 211.5/211.5 MB 12.4 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 56.3/56.3 MB 45.9 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 127.9/127.9 MB 20.7 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 207.5/207.5 MB 7.0 MB/s eta 0:00:00
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 21.1/21.1 MB 24.7 MB/s eta 0:00:00
BASE_DIR : /content/data
IMG_ROOT : /content/data/train
CSV_PATH : /content/drive/MyDrive/train_data/train.csv
Drive already mounted at /content/drive; to attempt to forcibly remount, call drive.mount("/content/drive", force_remount=True).
Save dir: /content/drive/MyDrive/Lite4_ISIC2020_latest
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
model.safetensors: 100%
 52.5M/52.5M [00:07<00:00, 7.25MB/s]
data_config: {'input_size': (3, 380, 380), 'interpolation': 'bilinear', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.92, 'crop_mode': 'center'}
Verwendete Inputgröße: (3, 380, 380)
Train positives: 460
Train negatives: 7521
base_pos_weight      = 16.3500
effective_pos_weight = 16.3500
USE_WEIGHTED_SAMPLER = False
Device: cuda

=== PHASE A: Head-Warmup ===

--- Warmup Epoch 1/3 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 43:13
[Train] Batch  100/125 |   0.45 batches/s | ETA 00:55
[Train] Batch  125/125 |   0.46 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 11:21
[Val] Batch   32/32 |   0.45 batches/s | ETA 00:00
[Warmup] Epoch 01 | train_loss 2.5955 acc 0.499 | val_loss 3.0264 acc 0.554 | val_ap 0.0683 | val_auc 0.5194 | val_bal 0.5435 | val_sens 0.6290 | val_spec 0.4580 | thr 0.29

--- Warmup Epoch 2/3 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 41:58
[Train] Batch  100/125 |   0.42 batches/s | ETA 00:59
[Train] Batch  125/125 |   0.44 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.07 batches/s | ETA 07:43
[Val] Batch   32/32 |   0.47 batches/s | ETA 00:00
[Warmup] Epoch 02 | train_loss 2.3532 acc 0.593 | val_loss 2.7383 acc 0.572 | val_ap 0.0784 | val_auc 0.5484 | val_bal 0.5599 | val_sens 0.6532 | val_spec 0.4665 | thr 0.30

--- Warmup Epoch 3/3 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 32:02
[Train] Batch  100/125 |   0.43 batches/s | ETA 00:58
[Train] Batch  125/125 |   0.44 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.07 batches/s | ETA 07:53
[Val] Batch   32/32 |   0.46 batches/s | ETA 00:00
[Warmup] Epoch 03 | train_loss 2.0922 acc 0.601 | val_loss 2.5167 acc 0.585 | val_ap 0.0898 | val_auc 0.5740 | val_bal 0.5798 | val_sens 0.6452 | val_spec 0.5145 | thr 0.38

=== PHASE B: Fine-Tuning ===

--- Finetune Epoch 1/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 42:16
[Train] Batch  100/125 |   0.41 batches/s | ETA 01:01
[Train] Batch  125/125 |   0.42 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 10:22
[Val] Batch   32/32 |   0.46 batches/s | ETA 00:00
Epoch 01 | train_loss 1.9238 acc 0.715 | val_loss 1.3734 acc 0.738 | val_ap 0.1930 | val_auc 0.7902 | val_bal 0.7201 | val_sens 0.7177 | val_spec 0.7224 | val_prec+ 0.1447 | val_f2+ 0.4005 | thr 0.43
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/Lite4_ISIC2020_latest/efficientnet_lite4_best.pt

--- Finetune Epoch 2/25 ---
[Train] Batch    1/125 |   0.07 batches/s | ETA 28:44
[Train] Batch  100/125 |   0.45 batches/s | ETA 00:55
[Train] Batch  125/125 |   0.47 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 10:49
[Val] Batch   32/32 |   0.49 batches/s | ETA 00:00
Epoch 02 | train_loss 1.0078 acc 0.759 | val_loss 1.4800 acc 0.853 | val_ap 0.1950 | val_auc 0.8178 | val_bal 0.7420 | val_sens 0.7177 | val_spec 0.7662 | val_prec+ 0.1673 | val_f2+ 0.4329 | thr 0.25
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/Lite4_ISIC2020_latest/efficientnet_lite4_best.pt

--- Finetune Epoch 3/25 ---
[Train] Batch    1/125 |   0.07 batches/s | ETA 29:01
[Train] Batch  100/125 |   0.46 batches/s | ETA 00:53
[Train] Batch  125/125 |   0.48 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.07 batches/s | ETA 07:26
[Val] Batch   32/32 |   0.48 batches/s | ETA 00:00
Epoch 03 | train_loss 0.8040 acc 0.809 | val_loss 1.0636 acc 0.767 | val_ap 0.2387 | val_auc 0.8382 | val_bal 0.7869 | val_sens 0.8710 | val_spec 0.7029 | val_prec+ 0.1610 | val_f2+ 0.4627 | thr 0.34
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/Lite4_ISIC2020_latest/efficientnet_lite4_best.pt

--- Finetune Epoch 4/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 43:11
[Train] Batch  100/125 |   0.42 batches/s | ETA 00:59
[Train] Batch  125/125 |   0.44 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 10:28
[Val] Batch   32/32 |   0.45 batches/s | ETA 00:00
Epoch 04 | train_loss 0.6618 acc 0.824 | val_loss 1.3360 acc 0.813 | val_ap 0.2237 | val_auc 0.8308 | val_bal 0.7637 | val_sens 0.7500 | val_spec 0.7773 | val_prec+ 0.1806 | val_f2+ 0.4599 | thr 0.37

--- Finetune Epoch 5/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 31:57
[Train] Batch  100/125 |   0.43 batches/s | ETA 00:57
[Train] Batch  125/125 |   0.45 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 09:40
[Val] Batch   32/32 |   0.45 batches/s | ETA 00:00
Epoch 05 | train_loss 0.5563 acc 0.852 | val_loss 1.2481 acc 0.812 | val_ap 0.3010 | val_auc 0.8541 | val_bal 0.7917 | val_sens 0.8387 | val_spec 0.7446 | val_prec+ 0.1769 | val_f2+ 0.4797 | thr 0.27
✓ Neuer BEST Checkpoint -> /content/drive/MyDrive/Lite4_ISIC2020_latest/efficientnet_lite4_best.pt

--- Finetune Epoch 6/25 ---
[Train] Batch    1/125 |   0.05 batches/s | ETA 43:06
[Train] Batch  100/125 |   0.46 batches/s | ETA 00:54
[Train] Batch  125/125 |   0.47 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 10:29
[Val] Batch   32/32 |   0.47 batches/s | ETA 00:00
Epoch 06 | train_loss 0.4831 acc 0.873 | val_loss 1.4849 acc 0.862 | val_ap 0.2632 | val_auc 0.8534 | val_bal 0.7797 | val_sens 0.7419 | val_spec 0.8174 | val_prec+ 0.2100 | val_f2+ 0.4925 | thr 0.26

--- Finetune Epoch 7/25 ---
[Train] Batch    1/125 |   0.08 batches/s | ETA 27:29
[Train] Batch  100/125 |   0.44 batches/s | ETA 00:56
[Train] Batch  125/125 |   0.46 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 10:43
[Val] Batch   32/32 |   0.44 batches/s | ETA 00:00
Epoch 07 | train_loss 0.4082 acc 0.899 | val_loss 1.5547 acc 0.848 | val_ap 0.2518 | val_auc 0.8451 | val_bal 0.7751 | val_sens 0.7661 | val_spec 0.7842 | val_prec+ 0.1885 | val_f2+ 0.4750 | thr 0.20

--- Finetune Epoch 8/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 36:04
[Train] Batch  100/125 |   0.44 batches/s | ETA 00:57
[Train] Batch  125/125 |   0.45 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.07 batches/s | ETA 07:48
[Val] Batch   32/32 |   0.47 batches/s | ETA 00:00
Epoch 08 | train_loss 0.3661 acc 0.903 | val_loss 1.5897 acc 0.875 | val_ap 0.2767 | val_auc 0.8647 | val_bal 0.7697 | val_sens 0.6935 | val_spec 0.8459 | val_prec+ 0.2275 | val_f2+ 0.4920 | thr 0.28

--- Finetune Epoch 9/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 35:47
[Train] Batch  100/125 |   0.42 batches/s | ETA 00:58
[Train] Batch  125/125 |   0.44 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.07 batches/s | ETA 07:55
[Val] Batch   32/32 |   0.45 batches/s | ETA 00:00
Epoch 09 | train_loss 0.2830 acc 0.926 | val_loss 1.7201 acc 0.875 | val_ap 0.2447 | val_auc 0.8537 | val_bal 0.7733 | val_sens 0.7339 | val_spec 0.8127 | val_prec+ 0.2040 | val_f2+ 0.4830 | thr 0.17

--- Finetune Epoch 10/25 ---
[Train] Batch    1/125 |   0.07 batches/s | ETA 28:27
[Train] Batch  100/125 |   0.46 batches/s | ETA 00:54
[Train] Batch  125/125 |   0.47 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.05 batches/s | ETA 11:05
[Val] Batch   32/32 |   0.45 batches/s | ETA 00:00
Epoch 10 | train_loss 0.2388 acc 0.939 | val_loss 1.9106 acc 0.895 | val_ap 0.2996 | val_auc 0.8690 | val_bal 0.8002 | val_sens 0.7984 | val_spec 0.8021 | val_prec+ 0.2089 | val_f2+ 0.5103 | thr 0.06

--- Finetune Epoch 11/25 ---
[Train] Batch    1/125 |   0.06 batches/s | ETA 37:03
[Train] Batch  100/125 |   0.45 batches/s | ETA 00:55
[Train] Batch  125/125 |   0.47 batches/s | ETA 00:00
[Val] Batch    1/32 |   0.06 batches/s | ETA 07:59
[Val] Batch   32/32 |   0.43 batches/s | ETA 00:00
Epoch 11 | train_loss 0.2530 acc 0.939 | val_loss 2.0691 acc 0.903 | val_ap 0.2925 | val_auc 0.8670 | val_bal 0.7939 | val_sens 0.7661 | val_spec 0.8216 | val_prec+ 0.2194 | val_f2+ 0.5113 | thr 0.07
Early stopping nach 11 Epochen.

Training abgeschlossen.
Checkpoints gespeichert in:
/content/drive/MyDrive/Lite4_ISIC2020_latest
---------------------------------------------------------------------------
UnpicklingError                           Traceback (most recent call last)
/tmp/ipython-input-3-1856164304.py in <cell line: 0>()
   1045 load_path = best_ckpt_path if os.path.exists(best_ckpt_path) else last_ckpt_path
   1046 
-> 1047 ckpt = torch.load(load_path, map_location=device)
   1048 
   1049 model = timm.create_model(

/usr/local/lib/python3.11/dist-packages/torch/serialization.py in load(f, map_location, pickle_module, weights_only, mmap, **pickle_load_args)
   1468                         )
   1469                     except pickle.UnpicklingError as e:
-> 1470                         raise pickle.UnpicklingError(_get_wo_message(str(e))) from None
   1471                 return _load(
   1472                     opened_zipfile,

UnpicklingError: Weights only load failed. This file can still be loaded, to do so you have two options, do those steps only if you trust the source of the checkpoint. 
	(1) In PyTorch 2.6, we changed the default value of the `weights_only` argument in `torch.load` from `False` to `True`. Re-running `torch.load` with `weights_only` set to `False` will likely succeed, but it can result in arbitrary code execution. Do it only if you got the file from a trusted source.
	(2) Alternatively, to load with `weights_only=True` please check the recommended steps in the following error message.
	WeightsUnpickler error: Unsupported global: GLOBAL numpy._core.multiarray._reconstruct was not an allowed global by default. Please use `torch.serialization.add_safe_globals([_reconstruct])` or the `torch.serialization.safe_globals([_reconstruct])` context manager to allowlist this global if you trust this class/function.

Check the documentation of torch.load to learn more about types accepted by default with weights_only https://pytorch.org/docs/stable/generated/torch.load.html.
