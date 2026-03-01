Classes: ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC', 'UNK']
num_classes: 9

After path matching: 25331 rows (missing paths dropped: 0)
Using model_name: tf_efficientnet_lite4
/usr/local/lib/python3.11/dist-packages/huggingface_hub/utils/_auth.py:94: UserWarning: 
The secret `HF_TOKEN` does not exist in your Colab secrets.
To authenticate with the Hugging Face Hub, create a token in your settings tab (https://huggingface.co/settings/tokens), set it as secret in your Google Colab and restart your session.
You will be able to reuse this secret in all of your notebooks.
Please note that authentication is recommended but still optional to access public models or datasets.
  warnings.warn(
model.safetensors: 100%
 52.5M/52.5M [00:08<00:00, 6.52MB/s]
Model data_config: {'input_size': (3, 380, 380), 'interpolation': 'bilinear', 'mean': (0.5, 0.5, 0.5), 'std': (0.5, 0.5, 0.5), 'crop_pct': 0.92, 'crop_mode': 'center'}
counts: Counter({1: 10300, 0: 3618, 2: 2658, 4: 2099, 3: 694, 7: 502, 6: 202, 5: 191})
class weights: tensor([ 0.6223,  0.2186,  0.8471,  3.2443,  1.0727, 11.7882, 11.1463,  4.4852,
         0.0000])
Device: cuda

=== PHASE A: Head-Warmup (Lite4) ===
[Warmup] Epoch 01 | train_loss 2.0641 acc 0.379 | val_loss 1.7510 acc 0.456
[Warmup] Epoch 02 | train_loss 1.9300 acc 0.414 | val_loss 1.5891 acc 0.513
[Warmup] Epoch 03 | train_loss 1.8226 acc 0.439 | val_loss 1.5293 acc 0.514

=== PHASE B: Fine-Tuning (Lite4) ===
Epoch 01 | train_loss 1.6433 acc 0.466 | val_loss 1.1823 acc 0.648
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_01.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 02 | train_loss 1.3796 acc 0.528 | val_loss 0.9962 acc 0.671
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_02.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 03 | train_loss 1.2691 acc 0.557 | val_loss 0.9776 acc 0.655
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_03.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 04 | train_loss 1.1951 acc 0.586 | val_loss 0.9194 acc 0.678
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_04.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 05 | train_loss 1.1440 acc 0.600 | val_loss 0.8762 acc 0.662
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_05.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 06 | train_loss 1.0717 acc 0.624 | val_loss 0.8182 acc 0.701
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_06.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 07 | train_loss 1.0269 acc 0.624 | val_loss 0.7530 acc 0.713
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_07.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 08 | train_loss 0.9889 acc 0.637 | val_loss 0.7542 acc 0.729
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_08.pt
Epoch 09 | train_loss 0.9717 acc 0.656 | val_loss 0.8031 acc 0.717
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_09.pt
Epoch 10 | train_loss 0.9401 acc 0.660 | val_loss 0.7323 acc 0.751
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_10.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 11 | train_loss 0.8798 acc 0.673 | val_loss 0.7679 acc 0.749
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_11.pt
Epoch 12 | train_loss 0.8797 acc 0.676 | val_loss 0.6869 acc 0.775
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_12.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 13 | train_loss 0.8402 acc 0.689 | val_loss 0.7116 acc 0.767
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_13.pt
Epoch 14 | train_loss 0.8243 acc 0.695 | val_loss 0.7463 acc 0.772
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_14.pt
Epoch 15 | train_loss 0.7985 acc 0.698 | val_loss 0.6832 acc 0.780
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_15.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 16 | train_loss 0.7964 acc 0.701 | val_loss 0.7186 acc 0.755
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_16.pt
Epoch 17 | train_loss 0.7612 acc 0.709 | val_loss 0.6722 acc 0.756
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_17.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 18 | train_loss 0.7478 acc 0.711 | val_loss 0.7748 acc 0.761
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_18.pt
Epoch 19 | train_loss 0.7403 acc 0.722 | val_loss 0.6976 acc 0.795
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_19.pt
Epoch 20 | train_loss 0.7014 acc 0.726 | val_loss 0.7928 acc 0.753
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_20.pt
Epoch 21 | train_loss 0.6516 acc 0.746 | val_loss 0.6794 acc 0.803
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_21.pt
Epoch 22 | train_loss 0.6025 acc 0.759 | val_loss 0.6262 acc 0.779
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_22.pt
✓ Updated BEST checkpoint -> checkpoints_per_epoch/efficientnet_lite4_best.pt
Epoch 23 | train_loss 0.5591 acc 0.771 | val_loss 0.6551 acc 0.818
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_23.pt
Epoch 24 | train_loss 0.5641 acc 0.770 | val_loss 0.7082 acc 0.812
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_24.pt
Epoch 25 | train_loss 0.5440 acc 0.780 | val_loss 0.7406 acc 0.802
✓ Saved epoch checkpoint -> checkpoints_per_epoch/efficientnet_lite4_epoch_25.pt
Classes: ['MEL', 'NV', 'BCC', 'AK', 'BKL', 'DF', 'VASC', 'SCC', 'UNK']

Loaded checkpoint for eval: checkpoints_per_epoch/efficientnet_lite4_best.pt (epoch 22)

===== VALIDATION METRICS (Lite4) =====
Balanced Accuracy : 0.8089
Macro F1          : 0.7559
Weighted F1       : 0.7865

Confusion Matrix:
       MEL    NV  BCC   AK  BKL  DF  VASC  SCC  UNK
MEL   685    63   28   24   89   4     2    9    0
NV    370  1917   62   11  198  10     3    4    0
BCC     8     8  577   33   25   4     2    8    0
AK      4     1   15  128   20   1     0    4    0
BKL    20     9   11   21  453   3     0    8    0
DF      2     0    2    3    1  38     0    2    0
VASC    0     4    0    0    0   0    47    0    0
SCC     4     0    4    9    9   1     0   99    0
UNK     0     0    0    0    0   0     0    0    0