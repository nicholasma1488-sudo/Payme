# Pay Me

给朋友圈用的私人货币。邮箱登录、用户名收款、命令栏转账、实时法币兑换、拍照拍卖，以及直连管理员的客服聊天。

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
| 管理员 / 客服 / 金库 | admin@payme.app | PaymeAdmin70! | admin |
| 朋友 | luna@payme.app | friends123 | luna |
| 朋友 | kai@payme.app | friends123 | kai |
| 朋友 | nova@payme.app | friends123 | nova |

新用户：用任意邮箱注册，再选一个用户名，别人就能 `/pay` 给你。

## 命令栏

底部输入框，或 `Ctrl/Cmd + K` 聚焦。

- `/pay 20 luna 午饭` — 付给用户名
- `/exchange 200 CNY` — 用人民币买入 Pay Me
- `/exchange 15 PAYME USD` — 把 Pay Me 兑成美元
- `/chat luna` — 按用户名打开私聊
- `/support` — 连接管理员客服
- `/sell` — 去拍卖上架

## 经济设计（70 人）

- 1 Pay Me（Ᵽ）默认锚定 **10 CNY**，管理员可改牌价
- 每人日常浮存按 **1,000 Ᵽ** 计
- 金库预留 15% 缓冲：`70 × 1000 × 1.15 = 80,500 Ᵽ`
- 对应人民币准备金 `805,000 CNY`
- 法币汇率来自公开中间价（USD 交叉），顶部行情条实时滚动
- 用户可把显示货币换成 CNY / USD / EUR 等，余额按直播价换算

兑换从管理员金库出入。金库不够或要走微信/支付宝时，在聊天里找客服。

## 技术

Next.js 15、SQLite、邮箱会话登录。无需外部数据库。
