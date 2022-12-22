/* eslint-disable @typescript-eslint/naming-convention */
const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  const RefreshButton = document.getElementById("refresh");
  RefreshButton.addEventListener("click", RefreshButtonClicked);

  const SelectAllButton = document.getElementById("select_all");
  SelectAllButton.addEventListener("click", SelectAllButtonClicked);

  const CreateFolderButton = document.getElementById("create_folder");
  CreateFolderButton.addEventListener("click", CreateFolderButtonClicked);

  const UploadButton = document.getElementById("upload");
  UploadButton.addEventListener("click", UploadButtonClicked);

  const DownloadButton = document.getElementById("download");
  DownloadButton.addEventListener("click", DownloadButtonClicked);

  const CopyDropDown = document.getElementById("copy_dropdown");
  CopyDropDown.addEventListener("change", CopyDropDownChanged);

  const EditDropDown = document.getElementById("edit_dropdown");
  EditDropDown.addEventListener("change", EditDropDownChanged);

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

function SelectAllButtonClicked() {
  vscode.postMessage({
    command: "select_all"
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

function DownloadButtonClicked(e) {

  let CheckedKeys = ""
  const CheckBoxList = document.querySelectorAll("[id^='checkbox_']");
  for (let i = 0; i < CheckBoxList.length; i++) {
    if(CheckBoxList[i]._checked)
    {
      CheckedKeys += "|" + CheckBoxList[i].id.replace("checkbox_", "");;
    }
  }

  vscode.postMessage({
    command: "download",
    keys: CheckedKeys
  });
}

function CopyDropDownChanged(e) {

  let CheckedKeys = ""
  const CheckBoxList = document.querySelectorAll("[id^='checkbox_']");
  for (let i = 0; i < CheckBoxList.length; i++) {
    if(CheckBoxList[i]._checked)
    {
      CheckedKeys += "|" + CheckBoxList[i].id.replace("checkbox_", "");;
    }
  }

  vscode.postMessage({
    command: "copy",
    action: e.target._value,
    keys: CheckedKeys
  });

  e.target._selectedIndex = 0;
}

function EditDropDownChanged(e) {

  let CheckedKeys = ""
  const CheckBoxList = document.querySelectorAll("[id^='checkbox_']");
  for (let i = 0; i < CheckBoxList.length; i++) {
    if(CheckBoxList[i]._checked)
    {
      CheckedKeys += "|" + CheckBoxList[i].id.replace("checkbox_", "");;
    }
  }

  vscode.postMessage({
    command: "edit",
    action: e.target._value,
    keys: CheckedKeys
  });

  e.target._selectedIndex = 0;
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

function AddShortcutLinkClicked(e) {
  vscode.postMessage({
    command: "add_shortcut",
    id: this.id
  });
}

function GoKeyLinkClicked(e) {
  vscode.postMessage({
    command: "go_key",
    id: e.target.id
  });
}

