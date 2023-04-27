export default class HandRaiser {
  constructor() {
    this.isRaised = false;
    this.userId = game.userId;
    this.moduleName = "raise-my-hand";

    // socketlib
    this.socket = socketlib.registerModule(this.moduleName);
    this.socket.register("sendNotification", this.sendNotification);
    this.socket.register("showHandDialogForEveryone", this.showHandDialogForEveryone); // Hand Dialog
    this.socket.register("showXCardDialogForEveryone", this.showXCardDialogForEveryone); // X-Card
    this.socket.register("showHandForEveryone", this.showHandForEveryone); // SHOW HAND FOR EVERYONE
    this.socket.register("removeHandForEveryone", this.removeHandForEveryone); // REMOVE HAND FOR EVERYONE
  }

  toggle() {
    if (game.settings.get(this.moduleName, "handToogleBehavior") && this.isRaised) this.lower();
    else this.raise();
  }

  async raise() {
    const id = this.userId;
    const player = game.users.get(id);

    if (game.settings.get(this.moduleName, "handToogleBehavior") && !this.isRaised) {
      this.isRaised = true;
      if (game.settings.get(this.moduleName, "showEmojiIndicator")) this.socket.executeForEveryone(this.showHandForEveryone, id);
    }

    // SHOW NOTIFICATION
    const showUiNotification = game.settings.get(this.moduleName, "showUiNotification");
    if (showUiNotification == 1) {
      const permanentFlag = game.settings.get(this.moduleName, "makeUiNotificationPermanent");
      this.socket.executeForEveryone(this.sendNotification, player, permanentFlag);
    } else if (showUiNotification === 2) {
      const permanentFlag = game.settings.get(this.moduleName, "makeUiNotificationPermanent");
      this.socket.executeForAllGMs(this.sendNotification, player, permanentFlag);
    }

    // ======================================
    // CHAT
    const showUiChatMessage = game.settings.get(this.moduleName, "showUiChatMessage");
    const showImageChatMessage = game.settings.get(this.moduleName, "showImageChatMessage");
    const imagePath = showImageChatMessage == 2 ? player.avatar : game.settings.get(this.moduleName, "chatimagepath");
    if (showUiChatMessage) {
      const chatImageWidth = game.settings.get(this.moduleName, "chatimagewidth");

      let message = `<label class="raise-my-hand titulo">${player.name}</label></br>
        <label class="raise-my-hand mensagem">${game.i18n.localize("raise-my-hand.CHATMESSAGE")}</label>`;
      if (showImageChatMessage) {
        message += `<p><img style="vertical-align:middle" src="${imagePath}" width="${chatImageWidth}%"></p>`;
      }

      let chatData = {
        speaker: null,
        content: message,
      };

      if (showUiChatMessage === 2) chatData.whisper = ChatMessage.getWhisperRecipients("GM");
      ChatMessage.create(chatData, {});
    } // END CHAT

    // SOUND
    if (game.settings.get(this.moduleName, "playSound")) {
      const soundVolume = game.settings.get(this.moduleName, "warningsoundvolume");
      const mySound = game.settings.get(this.moduleName, "warningsoundpath"); //const mySound = 'modules/raise-my-hand/assets/bell01.ogg';
      AudioHelper.play(
        {
          src: mySound,
          volume: soundVolume,
          autoplay: true,
          loop: false,
        },
        true
      );
    } // END SOUND

    // Show dialog image
    if (game.settings.get(this.moduleName, "showDialogMessage")) {
      const dimensions = await this.getDimensions(imagePath);
      this.socket.executeForEveryone(this.showHandDialogForEveryone, id, imagePath, dimensions);
    }
  }

  //-----------------------------------------------

  lower() {
    const id = this.userId;
    if (!this.isRaised) return;
    this.isRaised = false;
    if (game.settings.get(this.moduleName, "showEmojiIndicator")) {
      this.socket.executeForEveryone(this.removeHandForEveryone, id);
    }
  }

  sendNotification(player, permanentFlag) {
    ui.notifications.notify("✋ " + player.name + game.i18n.localize("raise-my-hand.UINOTIFICATION"), "info", { permanent: permanentFlag });
  }

  showHandForEveryone(id) {
    //THIS WILL ADD THE HAND
    $("[data-user-id='" + id + "'] > .player-name").append("<span class='raised-hand'>✋</span>");
  }

  removeHandForEveryone(id) {
    //THIS WILL REMOVE THE HAND
    $("[data-user-id='" + id + "'] > .player-name > .raised-hand").remove();
  }

  //-----------------------------------------------
  // Show  dialog with hand to everyone
  async showHandDialogForEveryone(id, imagePath, dimensions) {
    const isLarge = dimensions.width > 500 || dimensions.height > 500;
    const myDialogOptions = {
      id: "raise-my-hand-dialog",
      resizable: false,
      width: isLarge ? 500 : "100%",
      height: isLarge ? 500 : "100%",
    };

    const player = game.users.get(id);
    const templateData = {
      image_path: imagePath,
      player_name: player.name,
      player_color: player.color,
    };
    const myContent = await renderTemplate("modules/raise-my-hand/templates/hand.html", templateData);

    new Dialog(
      {
        title: player.name,
        content: myContent,
        buttons: {},
      },
      myDialogOptions
    ).render(true);
  }

  //-----------------------------------------------
  // X-Card
  async showXCardDialogForEveryone() {
    const myDialogOptions = {
      id: "raise-my-hand-dialog",
      resizable: false,
      width: 370,
      height: 440,
    };

    const imagePath = "modules/raise-my-hand/assets/xcard.webp";
    const templateData = { image_path: imagePath };
    const myContent = await renderTemplate("modules/raise-my-hand/templates/xcard.html", templateData);

    new Dialog(
      {
        title: "Stop!",
        content: myContent,
        buttons: {},
      },
      myDialogOptions
    ).render(true);

    // Sound X-Card
    if (game.settings.get(this.moduleName, "xcardsound")) {
      const soundVolume = game.settings.get(this.moduleName, "xcardsoundvolume");
      const mySound = "modules/raise-my-hand/assets/alarm.ogg";
      AudioHelper.play(
        {
          src: mySound,
          volume: soundVolume,
          autoplay: true,
          loop: false,
        },
        true
      );
    } // END IF
  }
  //-----------------------------------------------
  // X-Card
  showXCardDialogForEveryoneSocket() {
    const xcard = game.settings.get(this.moduleName, "xcard");
    if (xcard == 1) this.socket.executeForAllGMs(this.showXCardDialogForEveryone);
    else if (xcard == 2) this.socket.executeForEveryone(this.showXCardDialogForEveryone);
  }

  //
  async getDimensions(path) {
    return await new Promise((resolve) => {
      const img = new Image();
      img.addEventListener("load", () => {
        resolve({ width: img.width, height: img.height });
      });
      img.addEventListener("error", () => {
        reject(new Error(`Failed to load image at ${path}`));
      });
      img.src = path;
    });
  }
}
