---
title: "堆排序(Heap Sort)详解"
slug: "heap-sort-notes"
content_type: "note"
summary: "堆的下沉/上浮操作、建堆过程与堆排序完整流程,含复杂度分析与实现要点;算法课程笔记整理版。"
tags:
  - "course/CS308"
  - "algorithms"
  - "data-structures"
created: "2026-07-08"
updated: "2026-11-02"
---

## 堆排序 (Heap Sort) 详解

## 目录
- [核心概念](#核心概念)
- [堆的基本性质](#堆的基本性质)
- [堆排序完整流程](#堆排序完整流程)
- [时间复杂度分析](#时间复杂度分析)
- [代码实现](#代码实现)
- [排序过程详解](#排序过程详解)
- [性能特点](#性能特点)



## 核心概念

### 什么是堆？

**堆（Heap）** 是一种特殊的完全二叉树，满足堆性质：
- **最大堆**：父节点 ≥ 子节点（根节点是最大值）
- **最小堆**：父节点 ≤ 子节点（根节点是最小值）

```
# 堆在数组中的表示
数组: [10, 5, 3, 4, 1]
索引:  0   1  2  3  4

树形结构:
       10(0)
      /    \
    5(1)   3(2)
    /  \
  4(3) 1(4)

父子节点关系:
- 父节点索引 i 的左孩子: 2*i + 1
- 父节点索引 i 的右孩子: 2*i + 2
- 子节点索引 i 的父节点: (i-1) / 2
```

### 堆排序的核心思想

**关键理解**：
- ❌ **不是**"把最大值沉到最下面"
- ✅ **而是**"把最大值（堆顶）交换到数组末尾，然后缩小堆的范围，重新调整剩余部分"

**过程概括**：
1. 将无序数组构建成最大堆
2. 重复以下操作直到堆为空：
   - 交换堆顶（最大值）与堆的最后一个元素
   - 缩小堆的范围（最大值已在正确位置）
   - 对新的堆顶执行下沉操作，恢复堆性质



## 堆的基本性质

```
# 完全二叉树性质
完全二叉树（n个节点）:
- 高度: h = ⌊log₂ n⌋
- 叶子节点数: ⌈n/2⌉
- 非叶子节点数: ⌊n/2⌋
- 最后一个非叶子节点索引: n/2 - 1
```

```
# 最大堆性质
对于任意节点 i:
- arr[i] ≥ arr[2*i + 1]  (左孩子)
- arr[i] ≥ arr[2*i + 2]  (右孩子)

推论:
- 堆顶 arr[0] 是整个数组的最大值
- 任意子树的根节点是该子树的最大值
```



## 堆排序完整流程

### 阶段一：建堆（Build Heap）

**目标**：将无序数组调整为最大堆

**方法**：从最后一个非叶子节点开始，自底向上执行下沉操作（heapify）

```
原始数组: [4, 10, 3, 5, 1]

步骤1: 找到最后一个非叶子节点
索引 = n/2 - 1 = 5/2 - 1 = 1

步骤2: 自底向上调整
处理节点1(值10): 
  左孩子5 < 10, 右孩子1 < 10
  → 无需交换
  [4, 10, 3, 5, 1]

处理节点0(值4):
  左孩子10 > 4
  → 交换4和10
  [10, 4, 3, 5, 1]
  
  递归调整位置1的节点4:
  左孩子5 > 4
  → 交换4和5
  [10, 5, 3, 4, 1] ✓

建堆完成: [10, 5, 3, 4, 1]
```

**图解建堆过程**：

```
初始:        调整后:      最终:
   4            4           10
  / \          / \         /  \
 10  3   →   10   3   →   5    3
 / \         / \          / \
5   1       5   1        4   1
```

### 阶段二：排序（Heap Sort）

**目标**：逐个取出堆顶元素，放到数组末尾

**方法**：重复以下步骤直到堆为空
1. 交换堆顶与堆的最后一个元素
2. 堆大小减1（最大值已确定位置）
3. 对新堆顶执行下沉操作

```
建堆后: [10, 5, 3, 4, 1]

第1轮:
  交换 arr[0]=10 和 arr[4]=1
  → [1, 5, 3, 4 | 10]
     └未排序区┘  └已排序区┘
  
  调整 [0, 4) 的堆:
  1下沉 → [5, 4, 3, 1 | 10]

第2轮:
  交换 arr[0]=5 和 arr[3]=1
  → [1, 4, 3 | 5, 10]
  
  调整 [0, 3) 的堆:
  1下沉 → [4, 1, 3 | 5, 10]

第3轮:
  交换 arr[0]=4 和 arr[2]=3
  → [3, 1 | 4, 5, 10]
  
  调整 [0, 2) 的堆:
  无需调整 → [3, 1 | 4, 5, 10]

第4轮:
  交换 arr[0]=3 和 arr[1]=1
  → [1 | 3, 4, 5, 10]

最终结果: [1, 3, 4, 5, 10] ✓
```



## 时间复杂度分析

### 建堆阶段：O(n)

#### 常见误区

❌ **错误思路**：
```
n/2 个非叶子节点 × 每次 heapify O(log n) = O(n log n)
```

✅ **正确分析**：

**关键点**：
- 大部分节点在底层，下沉次数很少
- 只有少数节点（靠近根）需要下沉多次
- 加权平均后是 O(n)

```
# 层级分析
完全二叉树（n=15）:

              1                    ← h=3 (根节点)
            /   \
          2       3                ← h=2
         / \     / \
        4   5   6   7              ← h=1
       / \ / \ / \ / \
      8 9 A B C D E F              ← h=0 (叶子层)

层级 | 节点数 | 下沉次数 | 总操作数
-----|--------|----------|----------
  0  |  n/2   |    0     |    0
  1  |  n/4   |    1     |   n/4
  2  |  n/8   |    2     |   n/4
  3  | n/16   |    3     |  3n/16
 ... |  ...   |   ...    |   ...
log n|   1    |  log n   |  log n
```

```
# 数学推导
总操作数 = Σ(i=0 to log n) [n/(2^(i+1)) × i]
         = n × Σ(i=0 to log n) [i/2^(i+1)]
         = n × Σ(i=0 to ∞) [i/2^(i+1)]

计算级数 S = Σ(i=0 to ∞) [i/2^(i+1)]:
    S = 0/2 + 1/4 + 2/8 + 3/16 + 4/32 + ...
  S/2 =       0/4 + 1/8 + 2/16 + 3/32 + ...
  ───────────────────────────────────────
S-S/2 =       1/4 + 1/8 + 1/16 + 1/32 + ...
  S/2 = 1/4 × (1 + 1/2 + 1/4 + ...)
      = 1/4 × 2  (等比数列求和)
      = 1/2

所以 S = 1

因此: T(n) = n × 1 = O(n)
```

```
# 直观理解
建堆操作分布（n=15）:

层0(叶子): ████████ (8个节点，0次下沉) → 0次操作
层1:       ████     (4个节点，1次下沉) → 4次操作
层2:       ██       (2个节点，2次下沉) → 4次操作
层3(根):   █        (1个节点，3次下沉) → 3次操作
                                    总计: 11次

错误估算: 7个非叶子节点 × 3次 = 21次
实际操作: 11次（只有估算的 52%）
```

### 排序阶段：O(n log n)

#### 为什么排序不是 O(n)？

**关键差异**：

| 阶段 | 操作方式 | 堆大小 | 复杂度 |
|------|---------|--------|--------|
| **建堆** | 自底向上，批量处理 | 固定为 n | O(n) |
| **排序** | 自顶向下，逐个调整 | 递减 n→1 | O(n log n) |

**排序阶段分析**：

```
每次调整都从根节点开始:
第1次: heapify(arr, n-1, 0)  → 最坏下沉 log(n-1) 次
第2次: heapify(arr, n-2, 0)  → 最坏下沉 log(n-2) 次
...
第k次: heapify(arr, n-k, 0)  → 最坏下沉 log(n-k) 次

总操作数:
T_sort = Σ(k=1 to n-1) log₂(n-k)
       = log₂(n-1) + log₂(n-2) + ... + log₂(1)
       = log₂[(n-1)!]
       ≈ n log₂(n) - n log₂(e)
       = O(n log n)
```

**为什么不能用建堆的技巧？**

```
建堆能用 O(n) 的原因:
✓ 自底向上
✓ 堆大小固定为 n
✓ 利用"底层节点多但下沉少"
✓ 批量处理 n/2 个节点

排序不能用 O(n) 的原因:
✗ 自顶向下（每次从根开始）
✗ 堆大小递减 n→1
✗ 无法利用底层优势
✗ 逐个处理 n-1 次
✗ 每次平均下沉 log n 次
```

```
# 总时间复杂度
T(n) = T_build + T_sort
     = O(n) + O(n log n)
     = O(n log n)

实际操作数占比（n=10 的例子）:
建堆: 5 次 (23.8%)
排序: 16 次 (76.2%)
总计: 21 次
```



## 代码实现

```python
# 基础版本
def heapify(arr, n, i):
    """
    下沉操作：维护以i为根的子树的最大堆性质
    
    参数:
        arr: 数组
        n: 堆的大小
        i: 当前节点索引
    """
    largest = i          # 假设当前节点最大
    left = 2 * i + 1     # 左孩子索引
    right = 2 * i + 2    # 右孩子索引
    
    # 找出父节点、左孩子、右孩子中的最大值
    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right
    
    # 如果最大值不是父节点，交换并递归调整
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    """
    堆排序主函数
    """
    n = len(arr)
    
    # 阶段1: 建堆（从最后一个非叶子节点开始）
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    
    # 阶段2: 排序（逐个取出堆顶元素）
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]  # 交换堆顶和末尾
        heapify(arr, i, 0)               # 对剩余元素调整堆
    
    return arr
```

```cpp
# C++ 实现
#include <vector>
#include <algorithm>

void heapify(std::vector<int>& arr, int n, int i) {
    int largest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    
    if (left < n && arr[left] > arr[largest])
        largest = left;
    if (right < n && arr[right] > arr[largest])
        largest = right;
    
    if (largest != i) {
        std::swap(arr[i], arr[largest]);
        heapify(arr, n, largest);
    }
}

void heapSort(std::vector<int>& arr) {
    int n = arr.size();
    
    // 建堆
    for (int i = n / 2 - 1; i >= 0; i--)
        heapify(arr, n, i);
    
    // 排序
    for (int i = n - 1; i > 0; i--) {
        std::swap(arr[0], arr[i]);
        heapify(arr, i, 0);
    }
}
```

```python
# 详细注释版本（带调试输出）
def heapify_verbose(arr, n, i, step_info=False):
    """
    下沉操作（带调试信息）
    """
    largest = i
    left = 2 * i + 1
    right = 2 * i + 2
    
    if left < n and arr[left] > arr[largest]:
        largest = left
    if right < n and arr[right] > arr[largest]:
        largest = right
    
    if largest != i:
        if step_info:
            print(f"  交换 arr[{i}]={arr[i]} 和 arr[{largest}]={arr[largest]}")
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify_verbose(arr, n, largest, step_info)

def heap_sort_verbose(arr):
    """
    堆排序（带详细输出）
    """
    n = len(arr)
    
    print(f"原始数组: {arr}\n")
    
    # 建堆
    print("=== 建堆阶段 ===")
    for i in range(n // 2 - 1, -1, -1):
        print(f"处理节点 {i} (值={arr[i]}):")
        heapify_verbose(arr, n, i, step_info=True)
        print(f"  当前数组: {arr}\n")
    
    print(f"建堆完成: {arr}\n")
    
    # 排序
    print("=== 排序阶段 ===")
    for i in range(n - 1, 0, -1):
        print(f"第 {n-i} 轮:")
        print(f"  交换前: {arr}")
        print(f"  交换 arr[0]={arr[0]} 和 arr[{i}]={arr[i]}")
        
        arr[0], arr[i] = arr[i], arr[0]
        
        print(f"  交换后: {arr[:i]} | {arr[i:]}")
        print(f"  调整堆 [0, {i})")
        
        heapify_verbose(arr, i, 0, step_info=True)
        
        print(f"  调整后: {arr[:i]} | {arr[i:]}\n")
    
    return arr

## 测试
arr = [4, 10, 3, 5, 1]
result = heap_sort_verbose(arr)
print(f"最终结果: {result}")
```

```python
# 迭代版本（非递归）
def heapify_iterative(arr, n, i):
    """
    下沉操作的迭代版本（避免递归栈溢出）
    """
    while True:
        largest = i
        left = 2 * i + 1
        right = 2 * i + 2
        
        if left < n and arr[left] > arr[largest]:
            largest = left
        if right < n and arr[right] > arr[largest]:
            largest = right
        
        if largest == i:
            break
        
        arr[i], arr[largest] = arr[largest], arr[i]
        i = largest

def heap_sort_iterative(arr):
    """
    堆排序（迭代版本）
    """
    n = len(arr)
    
    # 建堆
    for i in range(n // 2 - 1, -1, -1):
        heapify_iterative(arr, n, i)
    
    # 排序
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify_iterative(arr, i, 0)
    
    return arr
```



```
# 排序过程详解
# 数组的两个区域
排序过程中数组被分为两部分:

[未排序区 | 已排序区]
 ↑         ↑
 需要调整  已确定，不再参与调整
```

### 为什么每次调整 [0, i] 而不是 [0, n]？

#### 原因1：已排序区已经确定

```
[当前堆 | 已排序区]
 ↑       ↑
 需要    已经是最大的几个值
 调整    且按降序排列，不需要动
```

**类比**：选美比赛，已经退场到领奖台的选手不再参与后续比拼

```
# 原因2：堆的性质只需维护未排序区
堆的性质: 父节点 ≥ 子节点

已排序区的值 ≥ 未排序区的任何值
所以不需要考虑已排序区

例子:
[9, 8, 5, 3, 1, 2, 4 | 10, 15, 20]
 └─────堆─────┘       └──已排序──┘
   最大值=9             最小值=10

9 < 10，所以已排序区不会影响堆的性质
```

```
# 原因3：效率优化
如果每次都对 [0, n] 调整:
- 第1轮: heapify(arr, 10, 0)  ← 浪费！位置9不需要参与
- 第2轮: heapify(arr, 10, 0)  ← 浪费！位置8-9都不需要参与

实际只需对未排序区调整:
- 第1轮: heapify(arr, 9, 0)   ← 只调整前9个元素
- 第2轮: heapify(arr, 8, 0)   ← 只调整前8个元素
```

```
# 完整示例演示
原始数组: [4, 10, 3, 5, 1]

=== 建堆阶段 ===
处理节点 1 (值=10):
  当前数组: [4, 10, 3, 5, 1]

处理节点 0 (值=4):
  交换 arr[0]=4 和 arr[1]=10
  交换 arr[1]=4 和 arr[3]=5
  当前数组: [10, 5, 3, 4, 1]

建堆完成: [10, 5, 3, 4, 1]

=== 排序阶段 ===
第 1 轮:
  交换前: [10, 5, 3, 4, 1]
  交换 arr[0]=10 和 arr[4]=1
  交换后: [1, 5, 3, 4] | [10]
  调整堆 [0, 4)
  交换 arr[0]=1 和 arr[1]=5
  交换 arr[1]=1 和 arr[3]=4
  调整后: [5, 4, 3, 1] | [10]

第 2 轮:
  交换前: [5, 4, 3, 1, 10]
  交换 arr[0]=5 和 arr[3]=1
  交换后: [1, 4, 3] | [5, 10]
  调整堆 [0, 3)
  交换 arr[0]=1 和 arr[1]=4
  调整后: [4, 1, 3] | [5, 10]

第 3 轮:
  交换前: [4, 1, 3, 5, 10]
  交换 arr[0]=4 和 arr[2]=3
  交换后: [3, 1] | [4, 5, 10]
  调整堆 [0, 2)
  调整后: [3, 1] | [4, 5, 10]

第 4 轮:
  交换前: [3, 1, 4, 5, 10]
  交换 arr[0]=3 和 arr[1]=1
  交换后: [1] | [3, 4, 5, 10]

最终结果: [1, 3, 4, 5, 10]
```

```
# 可视化：堆大小的变化
建堆后:
████████████████████  (堆大小 = 10)

第1轮:
█████████████████▓▓▓  (堆大小 = 9，▓ = 已排序)

第2轮:
██████████████▓▓▓▓▓▓  (堆大小 = 8)

第3轮:
███████████▓▓▓▓▓▓▓▓▓  (堆大小 = 7)

...

最后:
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  (堆大小 = 1)
```



## 性能特点

### 时间复杂度总结

| 情况 | 时间复杂度 | 说明 |
|------|-----------|------|
| **最好情况** | O(n log n) | 已排序数组也需要 O(n log n) |
| **平均情况** | O(n log n) | 稳定在 O(n log n) |
| **最坏情况** | O(n log n) | 比快速排序稳定 |
| **建堆** | O(n) | 自底向上建堆 |
| **排序** | O(n log n) | 逐个取出堆顶 |

```
# 空间复杂度
空间复杂度: O(1)
- 原地排序，只需常数额外空间
- 递归版本需要 O(log n) 栈空间
- 迭代版本只需 O(1) 空间
```

```
# 稳定性
稳定性: 不稳定

反例:
原始: [5a, 5b, 3]
建堆: [5a, 5b, 3]  (5a 和 5b 可能交换位置)
排序: [3, 5b, 5a]  (相同元素相对位置改变)
```

### 与其他排序算法对比

| 算法 | 时间复杂度（平均） | 空间复杂度 | 稳定性 | 特点 |
|------|------------------|-----------|--------|------|
| **堆排序** | O(n log n) | O(1) | 不稳定 | 最坏情况也是 O(n log n) |
| **快速排序** | O(n log n) | O(log n) | 不稳定 | 平均最快，最坏 O(n²) |
| **归并排序** | O(n log n) | O(n) | 稳定 | 稳定但需要额外空间 |
| **插入排序** | O(n²) | O(1) | 稳定 | 小数据或近乎有序时快 |

### 适用场景

#### 优势场景

1. **需要稳定的 O(n log n) 性能**
   - 不像快速排序会退化到 O(n²)
   - 适合对最坏情况有要求的场景

2. **空间受限的环境**
   - 原地排序，只需 O(1) 额外空间
   - 适合嵌入式系统、内存受限环境

3. **需要 Top K 问题**
   - 可以只建 K 大小的堆
   - 时间复杂度 O(n log k)

#### 劣势场景

1. **需要稳定排序**
   - 堆排序不稳定
   - 应使用归并排序

2. **小数据集**
   - 常数因子较大
   - 插入排序可能更快

3. **缓存不友好**
   - 访问模式不连续
   - 快速排序和归并排序更友好

### 优化技巧

```python
# 1. 混合排序
def hybrid_heap_sort(arr, threshold=10):
    """
    小数组用插入排序，大数组用堆排序
    """
    if len(arr) <= threshold:
        insertion_sort(arr)
    else:
        heap_sort(arr)
    return arr
```

```python
# 2. 迭代版本避免递归
## 使用迭代版本的 heapify
## 避免递归栈溢出，提高性能
```

```python
# 3. 降序排序用最小堆
def heapify_min(arr, n, i):
    """
    最小堆的下沉操作
    """
    smallest = i
    left = 2 * i + 1
    right = 2 * i + 2
    
    if left < n and arr[left] < arr[smallest]:
        smallest = left
    if right < n and arr[right] < arr[smallest]:
        smallest = right
    
    if smallest != i:
        arr[i], arr[smallest] = arr[smallest], arr[i]
        heapify_min(arr, n, smallest)

def heap_sort_descending(arr):
    """
    降序堆排序（使用最小堆）
    """
    n = len(arr)
    
    # 建最小堆
    for i in range(n // 2 - 1, -1, -1):
        heapify_min(arr, n, i)
    
    # 排序
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify_min(arr, i, 0)
    
    return arr
```



## 记忆要点

### 核心口诀

> **建堆**：自底向上，批量处理，O(n)  
> **排序**：堆顶退休，逐个确定，O(n log n)  
> **交换**：堆顶与末尾交换  
> **缩小**：已排序区不再管  
> **调整**：对剩余部分重建堆  
> **重复**：直到全部排好序

### 关键理解

1. **建堆为什么是 O(n)？**
   - 大部分节点在底层，下沉次数少
   - 加权平均：Σ(i/2^(i+1)) = 1

2. **排序为什么是 O(n log n)？**
   - 每次都从根节点开始下沉
   - 无法利用"底层节点多"的优势

3. **为什么调整 [0, i] 而不是 [0, n]？**
   - 已排序区已确定，不需要参与调整
   - 已排序区的值 ≥ 未排序区的任何值

### 常见错误

1. ❌ 认为建堆是 O(n log n)
   - ✅ 实际是 O(n)

2. ❌ 认为排序也是 O(n)
   - ✅ 排序是 O(n log n)

3. ❌ 每次对整个数组调整堆
   - ✅ 只对未排序区 [0, i) 调整

4. ❌ 认为堆排序是稳定的
   - ✅ 堆排序不稳定



## 扩展应用

```python
# 1. Top K 问题
def find_top_k(arr, k):
    """
    找出数组中最大的 K 个元素
    时间复杂度: O(n log k)
    """
    import heapq
    
    # 维护一个大小为 K 的最小堆
    heap = arr[:k]
    heapq.heapify(heap)
    
    for num in arr[k:]:
        if num > heap[0]:
            heapq.heapreplace(heap, num)
    
    return heap
```

```python
# 2. 优先队列
class PriorityQueue:
    """
    基于堆的优先队列
    """
    def __init__(self):
        self.heap = []
    
    def push(self, item, priority):
        heapq.heappush(self.heap, (-priority, item))
    
    def pop(self):
        return heapq.heappop(self.heap)[1]
    
    def is_empty(self):
        return len(self.heap) == 0
```

```python
# 3. 堆排序的在线版本
def online_heap_sort():
    """
    在线堆排序：边输入边排序
    """
    heap = []
    
    while True:
        num = input("输入数字（输入 'done' 结束）: ")
        if num == 'done':
            break
        
        heapq.heappush(heap, int(num))
        print(f"当前最小值: {heap[0]}")
    
    # 输出排序结果
    result = []
    while heap:
        result.append(heapq.heappop(heap))
    
    return result
```



## 参考资料

- 《算法导论》第6章：堆排序
- 《数据结构与算法分析》：堆的实现与应用
- 维基百科：Heapsort
- LeetCode 相关题目：
  - [215. 数组中的第K个最大元素](https://leetcode.com/problems/kth-largest-element-in-an-array/)
  - [347. 前 K 个高频元素](https://leetcode.com/problems/top-k-frequent-elements/)
  - [703. 数据流中的第 K 大元素](https://leetcode.com/problems/kth-largest-element-in-a-stream/)



**最后更新**: 2026-03-28
