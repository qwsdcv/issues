package models

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/astaxie/beego"
	"github.com/astaxie/beego/context"
	jwt "github.com/dgrijalva/jwt-go"
)

// FormatTime formats *time.Time to string with format "2006-01-02 15:04:05"
func FormatTime(t *time.Time) (ret string) {
	return t.Format("2006-01-02 15:04:05")
}

//CreateToken will return a token.
func CreateToken() (tokenStr string, err error) {
	key := beego.AppConfig.String("private_key")
	keyBuff := []byte(key)
	claims := &jwt.StandardClaims{
		ExpiresAt: 60*10 + time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err = token.SignedString(keyBuff)
	return
}

//Valid check the token is valid.
func Valid(tokenString string) (valid bool, err error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}
		key := beego.AppConfig.String("private_key")
		keyBuff := []byte(key)
		return keyBuff, nil
	})
	if err != nil {
		valid = false
	} else {
		valid = token.Valid
	}

	return
}

//FilterLogin flter login
func FilterLogin(ctx *context.Context) {
	if ctx.Input.IsGet() {
		return
	}
	if strings.Contains(ctx.Input.URL(), "secret") {
		return
	}
	if strings.Contains(ctx.Input.URL(), "comment") {
		return
	}

	token := ctx.Input.Header("Authorization")

	if token == "" {
		ctx.Abort(401, "Not Authorizd")
	} else {
		token = token[len("Basic "):]
	}
	ok, err := Valid(token)
	if err != nil {
		ctx.Abort(500, err.Error())
	}
	if !ok {
		ctx.Abort(401, "Not Authorizd")
	}
}

type visitFrequence struct {
	IP string
}

//FilterDDOS flter ddos attack
func FilterDDOS(ctx *context.Context) {
	ip := ctx.Input.IP()
	host := ctx.Input.Host()
	log.Printf("Connecting ip [%s], host is [%s].\n", ip, host)

}
