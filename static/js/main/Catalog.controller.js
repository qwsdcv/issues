sap.ui.define([
    'jquery.sap.global',
    'sap/m/MessageToast',
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'i/pkg/Formatter'
], function (jQuery, MessageToast, Controller, JSONModel, Formatter) {
    "use strict";


    var Catalog = Controller.extend("i.main.Catalog", {

        Formatter: Formatter,

        onInit: function () {

            this.Split = this.byId("Split");
            this.Tree = this.byId("catalog");
            this.Tree.setMode("SingleSelectMaster");
            this.Spacer = this.byId("Spacer");
            this.PopInput = null;
            this.TextArea = this.byId("TypeHere");
            this.initPasteEventHadler();

            this.HTML = this.byId("PreviewHere");

            this.JsonModel = new JSONModel();
            this.getView().setModel(this.JsonModel);

            this.NewType = Formatter.FOLDER;

            this.initPopup();

            this.loadMenu();


            this.Converter = new showdown.Converter();
            this.Converter.setOption('tables', true);
            this.Converter.setOption('tasklists', true);
            this.Converter.setOption('emoji', true);
            this.Converter.setOption('underline', true);
        },

        initPasteEventHadler: function (context) {
            let that = this;
            this.TextArea.onpaste = (thePasteEvent) => {
                if (thePasteEvent && thePasteEvent.originalEvent && thePasteEvent.originalEvent.clipboardData) {
                    let items = thePasteEvent.originalEvent.clipboardData.items;
                    if (items) {
                        for (var i = 0; i < items.length; i++) {
                            // Skip content if not image
                            if (items[i].type.indexOf("image") == -1) continue;
                            // Retrieve image on clipboard as blob
                            let blob = items[i].getAsFile();


                            let reader = new FileReader();
                            reader.readAsBinaryString(blob);
                            reader.onload = () => {
                                let obj = {
                                    type: blob.type,
                                    content: btoa(reader.result)
                                };
                                $.ajax({
                                    url: '/issues/attachment',
                                    method: 'POST',
                                    dataType: 'json',
                                    data: JSON.stringify(obj),
                                    contentType: 'application/json; charset=utf-8',
                                    error: (jqXHR, textStatus, errorThrown) => {
                                        MessageToast.show(errorThrown);
                                    },
                                    success: (json) => {
                                        MessageToast.show("Submited." + json.url);
                                        let picUrl = `![](${window.location.protocol}//${window.location.host}${json.url})`;
                                        let tt = that.TextArea;
                                        let ta = $(tt.getDomRef()).find('TextArea')[0];
                                        let start = ta.selectionStart;
                                        let end = ta.selectionEnd;

                                        let txt = tt.getValue();
                                        let newTxt = txt.substring(0, start) + picUrl + txt.substring(end);

                                        tt.setValue(newTxt);
                                        that.TextArea.fireLiveChange({ value: newTxt });
                                    }
                                });
                            }
                        }
                    }
                }
            };

        },

        getParameterByName: function (name) {
            var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.href);
            return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        },

        isEditMode() {
            try {
                let token = $.ajaxSetup()['headers']['Authorization'];
                return token != null;
            } catch (error) {
                return false;
            }
        },

        newDocument: function (event) {
            jQuery.sap.log.info("newDocument");
            let openTarget = this.Spacer;
            if (this.CurrentSelected) {
                openTarget = this.CurrentSelected;
            }
            this.NewType = Formatter.DOCUMENT;
            this.PopInput.openBy(openTarget);
        },
        deleteDocument: function(event){
            let that =this;
            jQuery.sap.log.info("deleteDocument");

            if(this.CurrentSelected == null){
                MessageToast.show("Not Select Item.");
                return;
            }

            let currentPath = this.CurrentSelected.getBindingContextPath();
            let obj = this.JsonModel.getObject(currentPath);

            $.ajax({
                url: '/issues/content/' + obj.id,
                method: 'DELETE',
                dataType: 'json',
                data: JSON.stringify(obj),
                contentType: 'application/json; charset=utf-8',
                error: (jqXHR, textStatus, errorThrown) => {
                    MessageToast.show(errorThrown);
                },
                success: (json) => {
                    MessageToast.show("Success Delete.");
                    that.loadMenu();
                }
            });
        },

        newFolder: function (event) {
            jQuery.sap.log.info("newFolder");
            let openTarget = this.Spacer;
            if (this.CurrentSelected) {
                openTarget = this.CurrentSelected;
            }
            this.NewType = Formatter.FOLDER;
            this.PopInput.openBy(openTarget);
        },

        initPopup: function () {
            if (!this.PopInput) {
                this.PopInput = sap.ui.xmlfragment("i.main.NewMenu", this);
            }
            this.getView().addDependent(this.PopInput);
            let that = this;

            let input = sap.ui.getCore().byId("NewMenuItem");
            input.onsapenter = (e) => {
                let text = input.getValue();
                that.PopInput.close();
                input.setValue('');
                jQuery.sap.log.info(text);

                let pId = null;
                if (that.CurrentSelected) {
                    let currentPath = that.CurrentSelected.getBindingContextPath();
                    let obj = that.JsonModel.getObject(currentPath);
                    if (obj.type == Formatter.FOLDER) {
                        pId = obj.id;
                    } else {
                        pId = obj.parent_id;
                    }

                }

                that.postNew({
                    title: text,
                    parent_id: pId,
                    type: that.NewType
                });
            };
        },
        loadMenu: function () {
            this.Tree.setBusy(true);
            let that = this
            $.ajax({
                url: '/issues/menu',
                method: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                error: (jqXHR, textStatus, errorThrown) => {
                    MessageToast.show(textStatus);
                    this.Tree.setBusy(false);
                },
                success: (json) => {
                    that.getView().getModel().setData({ catalogs: json }, true)
                    if (json.length > 0) {
                        let initId = json[0].id;
                        that.getContent(initId);
                    }
                    this.Tree.setBusy(false);
                }
            });
        },

        postNew: function (data) {
            this.Tree.setBusy(true);
            let that = this
            $.ajax({
                url: '/issues/menu',
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                error: (jqXHR, textStatus, errorThrown) => {
                    MessageToast.show(textStatus);
                    this.Tree.setBusy(false);
                },
                data: JSON.stringify(data),
                success: (json) => {
                    that.getView().getModel().setData({ catalogs: json }, true);
                    this.Tree.setBusy(false);
                }
            });
        },

        getComment: function () {
            let that = this;
            let commentStuff = this.byId('commentStuff');
            let CurrentContentBinding = this.getView().getModel().getProperty('/content');
            $.ajax({
                url: '/issues/comment/' + CurrentContentBinding.id,
                method: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                error: (jqXHR, textStatus, errorThrown) => {
                    MessageToast.show(textStatus);
                    commentStuff.setBusy(false);
                },
                success: (json) => {
                    that.getView().getModel().setProperty('/comments', json);
                    commentStuff.setBusy(false);
                }
            });
        },

        addComment: function () {
            let commentStuff = this.byId('commentStuff');
            let commentText = this.byId('TypeComment').getValue();
            this.byId('TypeComment').setValue('');
            let nickName = this.byId('nickNameInput').getValue();
            let CurrentContentBinding = this.getView().getModel().getProperty('/content');

            if (commentText && commentText != '' && commentText.trim() != '') {
                commentStuff.setBusy(true);
                let data = {
                    parent_id: CurrentContentBinding.id,
                    content: commentText,
                    nick_name: nickName
                };
                let that = this;
                $.ajax({
                    url: '/issues/comment' /*+ CurrentContentBinding.id*/,
                    method: 'POST',
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8',
                    error: (jqXHR, textStatus, errorThrown) => {
                        MessageToast.show(textStatus);
                        commentStuff.setBusy(false);
                    },
                    data: JSON.stringify(data),
                    success: (json) => {
                        that.getView().getModel().setProperty('/comments', json);
                        commentStuff.setBusy(false);
                    }
                });
            } else {
                MessageToast.show('不要评论空');
            }
        },

        go2Detail: function () {
            if (this.Split) {
                this.Split.toDetail(this.createId("detail"));
            }
        },
        selectionChange: function (oEvent) {
            this.go2Detail();
            var iItem = oEvent.getParameter("listItem");
            this.CurrentSelected = iItem/*.getBindingContextPath()*/;
            let currentPath = this.CurrentSelected.getBindingContextPath();
            let obj = this.JsonModel.getObject(currentPath);


            this.getContent(obj.id);
        },

        getContent: function (id) {
            let detailPage = this.byId("detail");
            detailPage.setBusy(true);
            let that = this;
            $.ajax({
                url: 'issues/content/' + id,
                method: 'GET',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                error: (jqXHR, textStatus, errorThrown) => {
                    MessageToast.show(textStatus);
                    detailPage.setBusy(false);
                },
                success: (json) => {
                    that.getView().getModel().setProperty('/content', json);
                    this.getComment(id);
                    let text = json.content;
                    that.TextArea.setValue(text);
                    that.TextArea.fireLiveChange({ value: text });
                    detailPage.setBusy(false);
                }
            });
        },

        setContent: function () {
            let CurrentContentBinding = this.getView().getModel().getProperty('/content');
            if (this.TextAreaChange && CurrentContentBinding && CurrentContentBinding.id) {
                let text = this.TextArea.getValue();
                CurrentContentBinding.content = text;
                $.ajax({
                    url: 'issues/content/' + CurrentContentBinding.id,
                    method: 'POST',
                    dataType: 'json',
                    data: JSON.stringify(CurrentContentBinding),
                    contentType: 'application/json; charset=utf-8',
                    error: (jqXHR, textStatus, errorThrown) => {
                        MessageToast.show(errorThrown);
                    },
                    success: (json) => {
                        MessageToast.show("Submited.");
                    }
                });
            }
        },

        go2Master: function () {
            if (this.Split) {
                this.Split.to(this.createId("master"));
            }
        },

        getNickName: function (nick) {
            if (nick && nick.trim()) {
                return nick;
            } else {
                return "匿名";
            }
        },
        getMarkDown: function (content) {
            let converter = this.Converter;
            let html = converter.makeHtml(content);
            let finalHtml = `<div>${html}</div>`;
            return finalHtml;
        },
        isMobile: function () {
            return sap.ui.Device.browser.mobile;
        },

        handleLiveChange: function (oEvent) {
            let sValue = oEvent.getParameter("value");

            let converter = this.Converter;
            let html = converter.makeHtml(sValue);
            let finalHtml = `<div>${html}</div>`;

            this.HTML.setContent(finalHtml);

            this.TextAreaChange = true;
        }

    });


    return Catalog;

});
