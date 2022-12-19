/* eslint-disable @typescript-eslint/naming-convention */
const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  const RefreshButton = document.getElementById("refresh");
  RefreshButton.addEventListener("click", RefreshButtonClicked);

  const CreateFolderButton = document.getElementById("create_folder");
  CreateFolderButton.addEventListener("click", CreateFolderButtonClicked);

  const UploadButton = document.getElementById("upload");
  UploadButton.addEventListener("click", UploadButtonClicked);

  const GoUpLink = document.getElementById("go_up");
  if(GoUpLink)
  {
    GoUpLink.addEventListener("click", GoUpLinkClicked);
  }

  const GoHomeLink = document.getElementById("go_home");
  if(GoHomeLink)
  {
    GoHomeLink.addEventListener("click", GoHomeLinkClicked);
  }

  const OpenLinkList = document.querySelectorAll("[id^='open_']");
  for (let i = 0; i < OpenLinkList.length; i++) {
    OpenLinkList[i].addEventListener("click", OpenLinkClicked);
  }

  const DownloadLinkList = document.querySelectorAll("[id^='download_']");
  for (let i = 0; i < DownloadLinkList.length; i++) {
    DownloadLinkList[i].addEventListener("click", DownloadLinkClicked);
  }

  const DeleteLinkList = document.querySelectorAll("[id^='delete_']");
  for (let i = 0; i < DeleteLinkList.length; i++) {
    DeleteLinkList[i].addEventListener("click", DeleteLinkClicked);
  }

  const CopyLinkList = document.querySelectorAll("[id^='copy_']");
  for (let i = 0; i < CopyLinkList.length; i++) {
    CopyLinkList[i].addEventListener("click", CopyLinkClicked);
  }

  const MoveLinkList = document.querySelectorAll("[id^='move_']");
  for (let i = 0; i < MoveLinkList.length; i++) {
    MoveLinkList[i].addEventListener("click", MoveLinkClicked);
  }

  const RenameLinkList = document.querySelectorAll("[id^='rename_']");
  for (let i = 0; i < RenameLinkList.length; i++) {
    RenameLinkList[i].addEventListener("click", RenameLinkList);
  }

  const CopyUrlLinkList = document.querySelectorAll("[id^='copy_url_']");
  for (let i = 0; i < CopyUrlLinkList.length; i++) {
    CopyUrlLinkList[i].addEventListener("click", CopyUrlLinkClicked);
  }

  const CopyS3UriLinkList = document.querySelectorAll("[id^='copy_s3_uri_']");
  for (let i = 0; i < CopyS3UriLinkList.length; i++) {
    CopyS3UriLinkList[i].addEventListener("click", CopyS3UriLinkClicked);
  }

  const AddShortcutLinkList = document.querySelectorAll("[id^='add_shortcut_']");
  for (let i = 0; i < AddShortcutLinkList.length; i++) {
    AddShortcutLinkList[i].addEventListener("click", AddShortcutLinkClicked);
  }

  const GoKeyLinkList = document.querySelectorAll("[id^='go_key']");
  for (let i = 0; i < GoKeyLinkList.length; i++) {
    GoKeyLinkList[i].addEventListener("click", GoKeyLinkClicked);
  }
}


function RefreshButtonClicked() {
  vscode.postMessage({
    command: "refresh"
  });
}

function CreateFolderButtonClicked() {
  vscode.postMessage({
    command: "create_folder"
  });
}

function UploadButtonClicked() {
  vscode.postMessage({
    command: "upload"
  });
}

function OpenLinkClicked(e) {
  vscode.postMessage({
    command: "open",
    id: e.target.id
  });
}

function GoUpLinkClicked() {
  vscode.postMessage({
    command: "go_up"
  });
}

function GoHomeLinkClicked() {
  vscode.postMessage({
    command: "go_home"
  });
}

function DownloadLinkClicked(e) {
  vscode.postMessage({
    command: "download",
    id: e.target.id
  });
}

function DeleteLinkClicked(e) {
  vscode.postMessage({
    command: "delete",
    id: e.target.id
  });
}

function CopyLinkClicked(e) {
  vscode.postMessage({
    command: "copy",
    id: e.target.id
  });
}

function MoveLinkClicked(e) {
  vscode.postMessage({
    command: "move",
    id: e.target.id
  });
}

function CopyUrlLinkClicked(e) {
  vscode.postMessage({
    command: "copy_url",
    id: e.target.id
  });
}

function CopyS3UriLinkClicked(e) {
  vscode.postMessage({
    command: "copy_s3_uri",
    id: e.target.id
  });
}

function AddShortcutLinkClicked(e) {
  vscode.postMessage({
    command: "add_shortcut",
    id: e.target.id
  });
}

function GoKeyLinkClicked(e) {
  vscode.postMessage({
    command: "go_key",
    id: e.target.id
  });
}

