# PAYME

圈子内部通用币市场（不是链上比特币）。邮箱登录、`/pay 20 @luna` 转账、当面现金兑换、拍照拍卖、客服入账。

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000

数据存在本地 `data/payme.db`，上传的拍卖照片在 `data/uploads/`。

## 演示账号

| 角色 | 邮箱 | 密码 | 用户名 |
| --- | --- | --- | --- |
| 管理员 / 客服 / 金库 | Nicholas_mzy14@hotmail.com | admin1121 | admin |
| 朋友 | luna@payme.app | friends123 | luna |
| 朋友 | kai@payme.app | friends123 | kai |
| 朋友 | nova@payme.app | friends123 | nova |

新用户和演示朋友余额都是 0。只有 admin 当面收到现金后入账，账户才会有 Ᵽ。

## 命令栏

底部输入框，或 `Ctrl/Cmd + K` 聚焦。

- `/pay 20 @luna` — 付给用户名
- `/exchange 200 CNY` — 预约当面现金买入 PAYME
- `/exchange 15 PAYME USD` — 预约当面现金兑出
- `/chat @luna` 或 `/add @kai` — 按用户名加朋友并打开私聊
- `/support` — 私信 @admin 客服（Nicholas_mzy14@hotmail.com）
- `/book` — 兑换预约，工作日 15:30 截止
- `/sell` — 去拍卖上架

## 经济设计（70 人）

- 1 Pay Me（Ᵽ）默认锚定 **10 CNY**，管理员可改牌价
- 每人日常浮存按 **1,000 Ᵽ** 计
- 金库预留 15% 缓冲：`70 × 1000 × 1.15 = 80,500 Ᵽ`
- 对应人民币准备金 `805,000 CNY`
- 法币汇率来自公开中间价（USD 交叉），顶部行情条实时滚动
- 用户可把显示货币换成 CNY / USD / EUR 等，余额按直播价换算

兑换只收当面现金。预约见面、交出现金后，管理员才从金库入账。

## 技术

Next.js 15、SQLite、邮箱会话登录。无需外部数据库。
