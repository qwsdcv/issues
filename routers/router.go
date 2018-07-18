package routers

import (
	"issues/controllers"

	"github.com/astaxie/beego"
)

func init() {
	beego.Router("/", &controllers.MainController{})
	beego.Router("/issues/menu", &controllers.IssueController{}, "post:AddMenu")
	beego.Router("/issues/menu", &controllers.IssueController{}, "get:LoadMenu")
	beego.Router("/issues/content/:id", &controllers.IssueController{}, "get:LoadContent")
	beego.Router("/issues/content/:id", &controllers.IssueController{}, "post:SetContent")
}
