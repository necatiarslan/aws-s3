/* eslint-disable @typescript-eslint/naming-convention */
const vscode = acquireVsCodeApi();

window.addEventListener("load", main);
const FileNameTextBox = document.getElementById("file_name");
const FileExtensionTextBox = document.getElementById("file_extension");
const FolderNameTextBox = document.getElementById("folder_name");

function main() {
  FileNameTextBox.addEventListener("keydown", TextBoxKeyDown);
  FileExtensionTextBox.addEventListener("keydown", TextBoxKeyDown);
  FolderNameTextBox.addEventListener("keydown", TextBoxKeyDown);

  const RefreshButton = document.getElementById("refresh");
  RefreshButton.addEventListener("click", RefreshButtonClicked);

  const SelectAllButton = document.getElementById("select_all");
  SelectAllButton.addEventListener("click", SelectAllButtonClicked);

  const SelectNoneButton = document.getElementById("select_none");
  SelectNoneButton.addEventListener("click", SelectNoneButtonClicked);

  const OpenLinkList = document.querySelectorAll("[id^='open_']");
  for (let i = 0; i < OpenLinkList.length; i++) {
    OpenLinkList[i].addEventListener("click", OpenLinkClicked);
  }

  const AddShortcutLinkList = document.querySelectorAll("[id^='add_shortcut_']");
  for (let i = 0; i < AddShortcutLinkList.length; i++) {
    AddShortcutLinkList[i].addEventListener("click", AddShortcutLinkClicked);
  }

  const CopyDropDown = document.getElementById("copy_dropdown");
  CopyDropDown.addEventListener("change", CopyDropDownChanged);

}

function TextBoxKeyDown(e){
  if (e.key === "Enter") {
    RefreshButtonClicked();
  }
}

function RefreshButtonClicked() {
  vscode.postMessage({
    command: "refresh",
    file_name: FileNameTextBox._value,
    file_extension: FileExtensionTextBox._value,
    folder_name: FolderNameTextBox._value
  });
}

function SelectAllButtonClicked() {
  const CheckBoxList = document.querySelectorAll("[id^='checkbox_']");
  for (let i = 0; i < CheckBoxList.length; i++) {
    CheckBoxList[i].checked = true;
  }
}

function SelectNoneButtonClicked() {
  const CheckBoxList = document.querySelectorAll("[id^='checkbox_']");
  for (let i = 0; i < CheckBoxList.length; i++) {
    CheckBoxList[i].checked = false;
  }
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

function OpenLinkClicked(e) {
  vscode.postMessage({
    command: "open",
    id: e.target.id
  });
}

function AddShortcutLinkClicked(e) {
  vscode.postMessage({
    command: "add_shortcut",
    id: this.id
  });
}