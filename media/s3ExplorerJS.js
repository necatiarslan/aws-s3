/* eslint-disable @typescript-eslint/naming-convention */
const vscode = acquireVsCodeApi();

window.addEventListener("load", main);
const SearchTextBox = document.getElementById("search_text");

function main() {
  SearchTextBox.addEventListener("keydown", SearchTextBoxKeyDown);

  const RefreshButton = document.getElementById("refresh");
  RefreshButton.addEventListener("click", RefreshButtonClicked);

  const SearchButton = document.getElementById("search");
  SearchButton.addEventListener("click", SearchButtonClicked);

  const SelectAllButton = document.getElementById("select_all");
  SelectAllButton.addEventListener("click", SelectAllButtonClicked);

  const SelectNoneButton = document.getElementById("select_none");
  SelectNoneButton.addEventListener("click", SelectNoneButtonClicked);

  const CreateFolderButton = document.getElementById("create_folder");
  CreateFolderButton.addEventListener("click", CreateFolderButtonClicked);

  const CreateFolderInEmptyFolderButton = document.getElementById("create_folder_in_empty_folder");
  if (CreateFolderInEmptyFolderButton) {
    CreateFolderInEmptyFolderButton.addEventListener("click", CreateFolderButtonClicked);
  }

  const UploadButton = document.getElementById("upload");
  UploadButton.addEventListener("click", UploadButtonClicked);

  const UploadEmptyFolderButton = document.getElementById("upload_empty_folder");
  if (UploadEmptyFolderButton) {
    UploadEmptyFolderButton.addEventListener("click", UploadEmptyFolderButtonClicked);
  }


  const DownloadButton = document.getElementById("download");
  DownloadButton.addEventListener("click", DownloadButtonClicked);

  const PreviewCurrentFileButton = document.getElementById("preview_current_file");
  if (PreviewCurrentFileButton) {
    PreviewCurrentFileButton.addEventListener("click", PreviewCurrentFileButtonClicked);
  }

  const DownloadCurrentFileButton = document.getElementById("download_current_file");
  if (DownloadCurrentFileButton) {
    DownloadCurrentFileButton.addEventListener("click", DownloadCurrentFileButtonClicked);
  }

  const UpdateFileButton = document.getElementById("update_file");
  if (UpdateFileButton) {
    UpdateFileButton.addEventListener("click", UpdateFileButtonClicked);
  }

  const DeleteFileButton = document.getElementById("delete_file");
  if (DeleteFileButton) {
    DeleteFileButton.addEventListener("click", DeleteFileButtonClicked);
  }

  const RenameFileButton = document.getElementById("rename_file");
  if (RenameFileButton) {
    RenameFileButton.addEventListener("click", RenameFileButtonClicked);
  }

  const CopyFileButton = document.getElementById("copy_file");
  if (CopyFileButton) {
    CopyFileButton.addEventListener("click", CopyFileButtonClicked);
  }

  const MoveFileButton = document.getElementById("move_file");
  if (MoveFileButton) {
    MoveFileButton.addEventListener("click", MoveFileButtonClicked);
  }

  const DeleteFolderButton = document.getElementById("delete_folder");
  if (DeleteFolderButton) {
    DeleteFolderButton.addEventListener("click", DeleteFolderButtonClicked);
  }

  const CopyDropDown = document.getElementById("copy_dropdown");
  CopyDropDown.addEventListener("change", CopyDropDownChanged);

  const EditDropDown = document.getElementById("edit_dropdown");
  EditDropDown.addEventListener("change", EditDropDownChanged);

  const GoUpLink = document.getElementById("go_up");
  if (GoUpLink) {
    GoUpLink.addEventListener("click", GoUpLinkClicked);
  }

  const FileDownloadLink = document.getElementById("file_download");
  if (FileDownloadLink) {
    FileDownloadLink.addEventListener("click", FileDownloadLinkClicked);
  }

  const FileUploadLink = document.getElementById("file_upload");
  if (FileUploadLink) {
    FileUploadLink.addEventListener("click", FileUploadLinkClicked);
  }

  const FolderCreateLink = document.getElementById("folder_create");
  if (FolderCreateLink) {
    FolderCreateLink.addEventListener("click", FolderCreateLinkClicked);
  }

  const FileDeleteLink = document.getElementById("file_delete");
  if (FileDeleteLink) {
    FileDeleteLink.addEventListener("click", FileDeleteLinkClicked);
  }

  const FileRenameLink = document.getElementById("file_rename");
  if (FileRenameLink) {
    FileRenameLink.addEventListener("click", FileRenameLinkClicked);
  }

  const FileCopyLink = document.getElementById("file_copy");
  if (FileCopyLink) {
    FileCopyLink.addEventListener("click", FileCopyLinkClicked);
  }

  const FileMoveLink = document.getElementById("file_move");
  if (FileMoveLink) {
    FileMoveLink.addEventListener("click", FileMoveLinkClicked);
  }

  const GoHomeLink = document.getElementById("go_home");
  if (GoHomeLink) {
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

  const SortLinkList = document.querySelectorAll("[id^='sort_']");
  for (let i = 0; i < SortLinkList.length; i++) {
    SortLinkList[i].addEventListener("click", SortLinkClicked);
  }

  const AutoRefreshCheckbox = document.getElementById("auto_refresh_checkbox");
  if (AutoRefreshCheckbox) {
    AutoRefreshCheckbox.addEventListener("change", AutoRefreshCheckboxChanged);
  }
}

function SearchTextBoxKeyDown(e) {
  if (e.key === "Enter") {
    RefreshButtonClicked();
  }
}

function RefreshButtonClicked() {
  vscode.postMessage({
    command: "refresh",
    search_text: SearchTextBox._value
  });
}

function SearchButtonClicked() {
  vscode.postMessage({
    command: "search"
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

function UploadEmptyFolderButtonClicked() {
  vscode.postMessage({
    command: "upload"
  });
}

function DownloadButtonClicked(e) {
  let CheckedKeys = GetCheckedKeys();

  vscode.postMessage({
    command: "download",
    keys: CheckedKeys
  });
}

function UpdateFileButtonClicked() {
  vscode.postMessage({
    command: "update_file"
  });
}

function DeleteFileButtonClicked() {
  vscode.postMessage({
    command: "delete_file"
  });
}

function RenameFileButtonClicked() {
  vscode.postMessage({
    command: "rename_file"
  });
}

function CopyFileButtonClicked() {
  vscode.postMessage({
    command: "copy_file"
  });
}

function MoveFileButtonClicked() {
  vscode.postMessage({
    command: "move_file"
  });
}

function DeleteFolderButtonClicked() {
  vscode.postMessage({
    command: "delete_folder"
  });
}

function PreviewCurrentFileButtonClicked(e) {
  vscode.postMessage({
    command: "preview_current_file"
  });
}

function DownloadCurrentFileButtonClicked(e) {
  vscode.postMessage({
    command: "download_current_file"
  });
}

function CopyDropDownChanged(e) {

  let CheckedKeys = GetCheckedKeys();

  vscode.postMessage({
    command: "copy",
    action: e.target._value,
    keys: CheckedKeys
  });

  e.target._selectedIndex = 0;
}

function EditDropDownChanged(e) {

  EditSelectedFiles(e.target._value);

  e.target._selectedIndex = 0;
}

function GetCheckedKeys() {
  let CheckedKeys = "";
  const CheckBoxList = document.querySelectorAll("[id^='checkbox_']");
  for (let i = 0; i < CheckBoxList.length; i++) {
    if (CheckBoxList[i]._checked) {
      CheckedKeys += "|" + CheckBoxList[i].id.replace("checkbox_", "");;
    }
  }
  return CheckedKeys;
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

function FileDownloadLinkClicked() {
  let CheckedKeys = GetCheckedKeys();

  vscode.postMessage({
    command: "download",
    keys: CheckedKeys
  });
}

function FileUploadLinkClicked() {
  vscode.postMessage({
    command: "upload"
  });
}

function FolderCreateLinkClicked() {
  vscode.postMessage({
    command: "create_folder"
  });
}

function FileDeleteLinkClicked() {
  EditSelectedFiles("Delete");
}

function EditSelectedFiles(action) {
  let CheckedKeys = GetCheckedKeys();

  vscode.postMessage({
    command: "edit",
    action: action,
    keys: CheckedKeys
  });
}

function FileRenameLinkClicked() {
  EditSelectedFiles("Rename");
}

function FileCopyLinkClicked() {
  EditSelectedFiles("Copy");
}

function FileMoveLinkClicked() {
  EditSelectedFiles("Move");
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

function SortLinkClicked(e) {
  vscode.postMessage({
    command: e.target.id
  });
}

function AutoRefreshCheckboxChanged(e) {
  const enabled = e.target.checked;
  const icon = document.getElementById("auto_refresh_icon");
  
  if (enabled) {
    icon.style.display = "inline-block";
  } else {
    icon.style.display = "none";
  }
  
  vscode.postMessage({
    command: "auto_refresh_toggle",
    enabled: enabled
  });
}

