# pg-big2

瀏覽器**大老二**：四人桌（你＋三名簡易 AI）、台灣常見牌力與牌型、自製音效。純前端，無建置步驟；**mobile-first**，桌面加寬。

名稱與介面為原創小品，致敬「大老二／鋤大 D」玩法類型，非任一商業作品復刻。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-big2&name=%E5%A4%A7%E8%80%81%E4%BA%8C)**

```
https://play.samkuo.me/?open=sampot/pg-big2&name=大老二
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| **開局** | 發牌；方塊 3 先出（首輪須含 ♦3） |
| 點手牌 | 選取／取消；可橫向滑動瀏覽 |
| **出牌** | 打出所選合法牌型 |
| **Pass** | 跟牌時跳過（首家不可） |
| **取消選取** | 清空選牌 |
| **音效開／關** | 靜音 |
| **重來** | 回待機 |

## 規則摘要

- 牌力：3 最小 → 2 最大；花色 ♦ &lt; ♣ &lt; ♥ &lt; ♠
- 單張／對子／三條；五張：順子 &lt; 同花 &lt; 葫蘆 &lt; 鐵支 &lt; 同花順（順子不含 2）
- 跟牌須同張數且壓過上家；五張可比牌型階
- 其餘人 Pass 後，最後出牌者自由出；先出完者勝

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 手機優先／桌面遞增 |
| `app.js` | UI、選牌、AI 節奏 |
| `game.js` | 規則、牌型、合法性 |
| `ai.js` | 簡易人機 |
| `audio.js` | Web Audio 合成音效 |
| `functions.js` | Playgrounds 可選 stub |

## License

MIT
