package handler

import (
	"fmt"
	"net/http"

	"github.com/SHERATONS/backend/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/line/line-bot-sdk-go/v7/linebot"
)

type LineWebhookHandler struct {
	bot    *linebot.Client
	config config.LineConfig
}

func NewLineWebhookHandler(cfg config.LineConfig) *LineWebhookHandler {
	bot, err := linebot.New(cfg.ChannelSecret, cfg.ChannelAccessToken)
	if err != nil {
		return nil
	}
	return &LineWebhookHandler{
		bot:    bot,
		config: cfg,
	}
}

func (h *LineWebhookHandler) Handle(c *gin.Context) {
	events, err := h.bot.ParseRequest(c.Request)
	if err != nil {
		if err == linebot.ErrInvalidSignature {
			c.Status(http.StatusBadRequest)
		} else {
			c.Status(http.StatusInternalServerError)
		}
		return
	}

	for _, event := range events {
		if event.Type == linebot.EventTypeMessage {
			switch message := event.Message.(type) {
			case *linebot.TextMessage:
				// If user sends "แจ้งเคลม" or clicks the Rich Menu button with this text
				if message.Text == "แจ้งเคลม" {
					h.replyWithFlex(event.ReplyToken)
				} else if message.Text == "ตรวจสอบสถานะเคลม" {
					h.replyWithStatusFlex(event.ReplyToken)
				}
			}
		}
	}
	c.Status(http.StatusOK)
}

func (h *LineWebhookHandler) replyWithFlex(replyToken string) {
	// LIFF ID includes a suffix and uses liff.state for routing
	liffBase := fmt.Sprintf("https://liff.line.me/%s-DpJyQIAL?liff.state=%%23%%2F", h.config.LiffChannelID)

	// Single bubble with all claim types
	options := []claimOption{
		{"เคลมรถยนต์/เครื่องจักร", liffBase + "CAREARClaim"},
		{"เคลมอสังหาริมทรัพย์/ไฟ/พายุ", liffBase + "FRIARClaim"},
		{"เคลมตัวเรือ (Hull)", liffBase + "HULLClaim"},
		{"เคลมสินค้าทางทะเล (Cargo)", liffBase + "CARGOClaim"},
		{"เคลมความรับผิดทางทะเล (CL)", liffBase + "CLClaim"},
		{"เคลมโดรน", liffBase + "DRONEClaim"},
		{"เคลมสัตว์เลี้ยง", liffBase + "PETClaim"},
		{"เคลมกอล์ฟ", liffBase + "GOLFClaim"},
		{"เคลมการเดินทาง (Travel)", liffBase + "TAClaim"},
		{"เคลมสุขภาพ/อุบัติเหตุ", liffBase + "AHClaim"},
		{"เคลมอื่นๆ", liffBase + "OTHERClaim"},
	}

	logoURL := h.config.BackendURL + "/static/logo.png"
	bubble := h.createBubble("แจ้งเคลมประกันภัย", "กรุณาเลือกประเภทกรมธรรม์ที่คุณต้องการแจ้งเคลม", options, logoURL)
	message := linebot.NewFlexMessage("เลือกประเภทการแจ้งเคลม", bubble)
	
	if _, err := h.bot.ReplyMessage(replyToken, message).Do(); err != nil {
		fmt.Printf("Error replying flex: %v\n", err)
	}
}

func (h *LineWebhookHandler) replyWithStatusFlex(replyToken string) {
	liffBase := fmt.Sprintf("https://liff.line.me/%s-DpJyQIAL?liff.state=%%23%%2F", h.config.LiffChannelID)
	notificationNo := "FIR-26-N-C0086"
	logoURL := h.config.BackendURL + "/static/logo.png"

	bubble := &linebot.BubbleContainer{
		Type: linebot.FlexContainerTypeBubble,
		Hero: &linebot.ImageComponent{
			Type:        linebot.FlexComponentTypeImage,
			URL:         logoURL,
			Size:        "full",
			AspectRatio: "20:13",
			AspectMode:  "cover",
		},
		Body: &linebot.BoxComponent{
			Type:   linebot.FlexComponentTypeBox,
			Layout: "vertical",
			Contents: []linebot.FlexComponent{
				&linebot.TextComponent{
					Type:   linebot.FlexComponentTypeText,
					Text:   "ทิพยประกันภัย",
					Weight: "bold",
					Size:   "md",
					Color:  "#1c3e93",
				},
				&linebot.BoxComponent{
					Type:   linebot.FlexComponentTypeBox,
					Layout: "vertical",
					Margin: "lg",
					Spacing: "sm",
					Contents: []linebot.FlexComponent{
						&linebot.TextComponent{
							Type: linebot.FlexComponentTypeText,
							Text: "ประเภท: การประกันภัยอัคคีภัย",
							Size: "sm",
							Color: "#666666",
						},
						&linebot.TextComponent{
							Type: linebot.FlexComponentTypeText,
							Text: fmt.Sprintf("เลขที่: %s", notificationNo),
							Size: "sm",
							Color: "#666666",
						},
						&linebot.BoxComponent{
							Type:            linebot.FlexComponentTypeBox,
							Layout:          "horizontal",
							Margin:          "md",
							BackgroundColor: "#46c31d",
							CornerRadius:    "xl",
							PaddingAll:      "xs",
							Contents: []linebot.FlexComponent{
								&linebot.TextComponent{
									Type:   linebot.FlexComponentTypeText,
									Text:   "สถานะ: มีความคุ้มครอง",
									Size:   "xs",
									Color:  "#ffffff",
									Align:  "center",
									Weight: "bold",
								},
							},
						},
						&linebot.TextComponent{
							Type:   linebot.FlexComponentTypeText,
							Text:   "วันที่เริ่มต้น: 12 กรกฎาคม 2563",
							Size:   "xs",
							Color:  "#999999",
							Margin: "md",
						},
						&linebot.TextComponent{
							Type:  linebot.FlexComponentTypeText,
							Text:  "วันที่สิ้นสุด: 12 กรกฎาคม 2588",
							Size:  "xs",
							Color: "#999999",
						},
					},
				},
				&linebot.ButtonComponent{
					Type:   linebot.FlexComponentTypeButton,
					Action: linebot.NewURIAction("ตรวจสอบสถานะเคลม", "https://www.dhipaya.co.th"),
					Style:  "primary",
					Color:  "#1c3e93",
					Height: "sm",
					Margin: "xl",
				},
				&linebot.ButtonComponent{
					Type:   linebot.FlexComponentTypeButton,
					Action: linebot.NewURIAction("อัพโหลดไฟล์เพิ่มเติม", liffBase+"ExtraUpload"),
					Style:  "primary",
					Color:  "#1c3e93",
					Height: "sm",
					Margin: "md",
				},
			},
		},
	}

	message := linebot.NewFlexMessage("ตรวจสอบสถานะเคลม", bubble)
	if _, err := h.bot.ReplyMessage(replyToken, message).Do(); err != nil {
		fmt.Printf("Error replying status flex: %v\n", err)
	}
}

type claimOption struct {
	label string
	url   string
}

func (h *LineWebhookHandler) createBubble(title, subtitle string, options []claimOption, logoURL string) *linebot.BubbleContainer {
	var bodyContents []linebot.FlexComponent

	// Logo
	if logoURL != "" {
		bodyContents = append(bodyContents, &linebot.ImageComponent{
			Type:        linebot.FlexComponentTypeImage,
			URL:         logoURL,
			Size:        "full",
			AspectRatio: "20:13",
			AspectMode:  "cover",
		})
	}

	// Title
	bodyContents = append(bodyContents, &linebot.TextComponent{
		Type:   linebot.FlexComponentTypeText,
		Text:   title,
		Weight: "bold",
		Size:   "sm",
		Color:  "#1c3e93",
	})

	// Subtitle
	bodyContents = append(bodyContents, &linebot.TextComponent{
		Type: linebot.FlexComponentTypeText,
		Text: subtitle,
		Size: "xs",
		Wrap: true,
	})

	// Separator
	bodyContents = append(bodyContents, &linebot.SeparatorComponent{
		Margin: linebot.FlexComponentMarginTypeMd,
	})

	// Buttons
	for i, opt := range options {
		margin := linebot.FlexComponentMarginTypeMd
		if i == 0 {
			margin = linebot.FlexComponentMarginTypeLg
		}
		bodyContents = append(bodyContents, &linebot.ButtonComponent{
			Type:   linebot.FlexComponentTypeButton,
			Action: linebot.NewURIAction(opt.label, opt.url),
			Style:  "primary",
			Color:  "#1c3e93",
			Height: "sm",
			Margin: margin,
		})
	}

	return &linebot.BubbleContainer{
		Type: linebot.FlexContainerTypeBubble,
		Body: &linebot.BoxComponent{
			Type:     linebot.FlexComponentTypeBox,
			Layout:   "vertical",
			Contents: bodyContents,
		},
	}
}
