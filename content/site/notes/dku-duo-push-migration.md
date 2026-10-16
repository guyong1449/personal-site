---
title: "DKU Duo Push 设备换绑流程"
slug: "dku-duo-push-migration"
content_type: "note"
summary: "官方网页换绑、无法登录时的 recovery email 流程，以及 Duo Restore 和安卓设备的安装说明"
tags:
  - "DKU"
  - "DUO"
created: "2026-10-15"
updated: "2026-10-15"
---

作为Duo Push用户, 无论是手机丢了坏了, 又或者换新手机, 都会不得不面临原有手机上 Duo Mobile 需要换绑的操作. 
小红书等等其他的论坛常常会提到如下的做法: 在 MFA 界面,删除已经认证的手机号码所关联的账号, 再重新加回来, 这些完全不适用于 DKU 的情况, 都是瞎折腾啊可以说.


而且你也不希望自己把账号删完了, 然后走投无路登陆不上去对吧 ^^


所以以下是一些本人踩坑后总结出来的步骤, 希望能有帮助.

 
以下是本文速览：  
「Section 1」DKU 官方网页换绑怎么走  
「Section 2」Duo Restore 本身的备份恢复方法  
「Section 3」安卓设备的Google 服务、下载问题和避坑提醒  

## 「Section 1」DKU IT官方网页换绑方法

**DKU IT 提供的的这套流程同时支持 iOS 换 iOS、Android 换 Android，以及苹果安卓互转**，适用范围比**方法二**中 Duo Restore 不能跨系统的恢复范围更广，也更适合“新手机已经到手，但旧验证还留在原设备上”的情况。

不过，这套方法的前提：是还能登录下面两个页面。  
https://idms-web-selfservice.oit.duke.edu/  
https://idms-mfa.oit.duke.edu/

如果现在是手机丢了、旧设备不在手边、这两个页面也都登不上，而且之前也没有做过 Duo Mobile 备份，先看下面这一段。如果也没有认证 recovery email，那基本就卡住了。这种时候直接发邮件到 `service-desk@dukekunshan.edu.cn` 联系 IT 处理会更省时间。

### 登不上 DKU 网站, 用不了方法一怎么办?

如果你的原有的 Duo Mobile 设备坏了, 然后 DKU 的 MFA 和 Self Service 都登陆不上, 请不要慌张 ^^, 按照下面的流程走完之后, 仍然可以顺利进行方法一的操作.

但是首先条件是你认证了 recovery email, 如果没认证的话, 以下流程不适用, 遇到的倒霉同学可以邮件 IT ( 所以请记得认证 recovery email呀 )

接下来的所有操作, 需要确保认证的相关标签页在同一个浏览器界面完成!
也就是不要新开浏览器界面, 我这边垂直标题栏是这样显示的, 横板标签栏同理. 
如果是手机端操作, 请复制链接到浏览器中, 不能直接跳转
![在同一个浏览器窗口中保留相关标签页](assets/duo-image-678.png)


1. 打开浏览器的隐私模式, 像 edge 浏览器就是右上角的无痕模式
![打开浏览器无痕窗口](assets/duo-image-675.png)

打开后会和普通窗口有一定的区分, 一般会变成深色
![无痕浏览器窗口示例](assets/duo-image-676.png)

2. 登录你的 recovery email 的邮箱, 我这里是 QQ 邮箱.
3. 复制这个链接到同一个浏览器界面下面新的标签页,
   https://idms-mfa.oit.duke.edu/mfa/bypass/verification
   如果你原本没法登陆 MFA 界面, 那么你会遇到 DKU Login 的 shibboleth 界面, 由于这个链接是 bypass 的, 所以不用慌张, 并不需要 Duo Push 等等操作, 我们填写 netid 和密码之后就能坚持访问!

   > 还有 IT 也可能会出错, 如果给你的链接是 https://idms-mfa.oit.duke.edu/mfa/bypass/identity-verification, 这个还是会出现无法绕过的问题
    
4. 来到以下界面, 点击第二个 verify identity using recovery email
   ![选择 recovery email 进行身份验证](assets/duo-image-680.png)
5. 紧接着你的邮箱就会收到如下邮件, 复制邮箱内的链接到新的浏览器标签页并进入, 
   ![Recovery Email 身份验证邮件（个人信息已遮挡）](assets/duo-recovery-email.png)
   会出现以下界面, 你会看到很多 passcode, 这些 passcode 都是一次性的, 会用于接下来的认证. 
   > 一次性 passcode 的个人截图已省略。页面会列出可用于接下来认证的 passcode。
6. 复制一个 passcode, 登录  https://idms-mfa.oit.duke.edu/mfa/home
   在如下需要认证的界面粘贴 passcode, 恭喜你可以顺利进行接下来方法一的操作了!
   ![在 Duke 登录页填写 passcode](assets/duo-image-682.png)

### 可以登录后的设备换绑步骤

第一步，请确保自己在 Self-Service     https://idms-web-selfservice.oit.duke.edu/    
已经认证过 recovery email，如果没有认证通过，可以参照下图点进去进行认证    
**（推荐大家都认证一下, IT 说当时 4 月发了邮件让大家都认证来着）**

![Self-Service 的 Manage Email Settings 入口](assets/duo-image-664.png)

点击 Manage Email Settings 进入之后, 出现如下界面,
只认证到 **第二个** 就可以, 
**不用管第三个 CLEAR !!! 
国内是登不上的, 开代理也没用, 直接不用管!**

![Recovery Email 验证页面](assets/duo-image-666.png)

第二步，认证完成后，登录 https://idms-mfa.oit.duke.edu/ 
如果你之前已经绑过手机号，页面里一般会显示对应设备。点进去之后，按提示填写必要信息，勾选生成新的 QR code，然后继续。

![MFA 设备管理入口](assets/duo-image-667.png)

![选择设备并生成新的 QR code](assets/duo-image-668.png)

第三步，首先打开 Duo Mobile

   参照 **墙记｜入学指南之NetID相关** https://mp.weixin.qq.com/s/LHGlizTbA6D4_kssW44-cw

>   Step 3. 下载手机应用Duo Mobile
>   安卓鸿蒙请用浏览器访问 https://people.dukekunshan.edu.cn/~bz106/DuoMobile-4.44.0.apk
>   iOS请在APP Store中搜索Duo Mobile并下载。

![Duo Mobile 下载页面](assets/duo-image-671.png)

扫完二维码以后，手机上点保存，然后**一定要回到网页端继续点 `continue`**。这一步特别容易漏掉，但它其实决定了这次绑定有没有真正激活成功。

![扫码后回到网页点击 Continue](assets/duo-image-669.png)

- 不点的话相当于没有激活!     
  失败情况如下:    
  比如在登录 vpn 的时候, 出现的界面应该是输 1 让你 check Duo Push,  

![正常的 Duo Push 提示](assets/duo-image-673.png)

如果你看到的反而是要求输入 passcode 的界面，常见原因就是前面扫完码以后没有点网页端的 `continue`，设备其实没有真正激活成功。

![未激活时仅显示 passcode 的提示](assets/duo-image-672.png)

到这里，方法一基本就走完了, 我们安全了, 暂时地。
虽然看起来文字不少，但实际操作就几步：**确认 recovery email，进 MFA 页面生成新二维码，用 Duo Mobile 扫码，然后点 continue 完成激活。**

## 「Section 2」Duo Restore 本身的备份恢复方法

在 Duo Mobile 左侧菜单的 `帮助` 里，可以进入官方的 Duo Restore 页面：  
https://guide.duo.com/duo-restore/


是否能恢复 DKU / Duke 账号, 还取决于学校 Duo 管理端是否启用了 Instant Restore.  
**Duo Restore 只支持同系统迁移,** 也就是 iPhone -> iPhone 或 Android -> Android 这种情况，通常不适合直接跨系统迁移。

 简要说明具体方法的话:  
 iOS 通常依赖 iCloud / iCloud Keychain, 然后在新设备上把备份导入.  
 Android 端通常依赖 Google 账号备份或 Google Drive 备份机制, 具体入口会随 Duo Mobile 版本变化.  
 
 但是 Android 能这么操作的前提, 是手机有稳定的 Google Play services 和备份环境, 如果没有的话, 请参照以下教程安装:

## 「Section 3」安卓设备安装 Google 服务与避坑提醒

 安卓设备安装“谷歌三件套”，本质上是在一个原本没有完整 Google Mobile Services 的 Android 系统里，补上 Google 账号、后台服务和应用商店这几层能力。

这部分一般统称成“谷歌三件套”。简单理解的话，主要就是下面三样：

- `Google Services Framework (GSF)`：负责基础注册和通信。
- `Google Play services`：负责 Google 登录、推送、定位、同步等很多后台能力，它是 GMS 体系里最核心的组件之一，但它本身不等于整个 GMS。
- `Google Play Store`：负责登录 Google 账号、下载和更新 App。

常见的安装顺序是 ` GSF -> Google Play services -> Google Play Store `

大致可以把安卓设备分成三种情况来看：

第一种，系统本来就自带谷歌基础服务或相关开关。  
这种比较方便，直接在设置里搜 `Google` / `谷歌基础服务` / `谷歌服务`，打开以后再去装或更新 Play Store，通常就够用了。

第二种，系统没有明显开关，但底层兼容 GMS。  
这种可以尝试手动安装三件套，或者用可信来源的一键安装工具辅助处理。

第三种，系统本身对 GMS 支持就不稳定。  
哪怕你把三件套装上了，后面还是可能出现 Play Store 闪退、无法登录，或者设备显示未认证。这种情况往往说明**设备缺少稳定的系统级 GMS 支持，或者 Play Protect 认证本身就不完整**。如果已经走到这一步，通常就不建议继续无限折腾。

具体安装方案如下:
可以通过如下的软件进行一键安装.  需要梯子上 github.
下面的网址可以下载自动识别安卓设备版本并安装谷歌服务的软件.  请首选两个蓝框内的软件. 其他软件可能存在要求付费的操作, 普通免费软件就能达成相应的功能.  
(目前这两个软件都是免费而且基本纯净的, 如果安装过程中出现异常, 请及时停止)

sky22333/Google-Play-Store: 谷歌三件套安装教程，google-play-store，谷歌商店，谷歌服务，谷歌框架 
https://github.com/sky22333/Google-Play-Store/releases


![Google 服务安装器下载选项](assets/duo-image-674.png)


也请尽量只从可信来源下载, 不要在第三方安装器或不明网页里输入 Google 账号密码, 也不要购买所谓代装服务.  

有软件自动帮你识别适配版本, 比自己手动查版本安装还是快多了.
当然, 如果你想手动下载特定版本的内容, 也可以参考下面的教程.  ​ 
https://github.com/sky22333/Google-Play-Store

## 「写在最后」

常见提醒

最重要的一条还是：**先走方法一，再考虑方法二。** 请不要随便参考校外教程帖子进行乱操作, 如果遇到问题请及时邮件联系 IT。

如果你卡在“两个 Duke 页面都登不上、旧手机也不在、又没有做备份，也没有认证 recovery email”这种情况下，不建议自己折腾，直接联系学校 IT 才是最好的做法。

网址汇总

DKU IT：  
https://it.dukekunshan.edu.cn/

Duke MFA 管理页：  
https://idms-mfa.oit.duke.edu/mfa/home

Duke Self-Service：  
https://idms-web-selfservice.oit.duke.edu/

Duo Mobile 的 Google Play 页面：  
https://play.google.com/store/apps/details?id=com.duosecurity.duomobile
