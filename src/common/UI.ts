import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MethodResult } from './MethodResult';

var outputChannel: vscode.OutputChannel;
var logsOutputChannel: vscode.OutputChannel;

var NEW_LINE:string = " | ";

export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

export function showOutputMessage(message: any, popupMessage: string = "Results are printed to OUTPUT / AwsS3-Extension", clearPrevMessages:boolean=true): void {

  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("AwsS3-Extension");
  }

  if(clearPrevMessages)
  {
    outputChannel.clear();
  }

  if (typeof message === "object") {
    outputChannel.appendLine(JSON.stringify(message, null, 4));
  }
  else {
    outputChannel.appendLine(message);
  }
  outputChannel.show();

  if(popupMessage.length > 0)
  {
    showInfoMessage(popupMessage);
  }
}

export function logToOutput(message: any, error?: Error): void {
  let now = new Date().toLocaleString();

  if (!logsOutputChannel) {
    logsOutputChannel = vscode.window.createOutputChannel("AwsS3-Log");
  }

  if (typeof message === "object") {
    logsOutputChannel.appendLine("[" + now + "] " + JSON.stringify(message, null, 4));
  }
  else {
    logsOutputChannel.appendLine("[" + now + "] " + message);
  }

  if (error) {
    logsOutputChannel.appendLine(error.name);
    logsOutputChannel.appendLine(error.message);
    if(error.stack)
    {
      logsOutputChannel.appendLine(error.stack);
    }
  }
}

export function showInfoMessage(message: string): void {
  vscode.window.showInformationMessage(message);
}

export function showWarningMessage(message: string): void {
  vscode.window.showWarningMessage(message);
}

export function showErrorMessage(message: string, error: Error): void {
  if (error) {
    vscode.window.showErrorMessage(message + NEW_LINE + error.name + NEW_LINE + error.message);
  }
  else {
    vscode.window.showErrorMessage(message);
  }
}

export function getExtensionVersion() {
  const { version: extVersion } = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), { encoding: 'utf8' })
  );
  return extVersion;
}

export function openFile(file: string) {
  vscode.commands.executeCommand('vscode.open', vscode.Uri.file(file), vscode.ViewColumn.One);
}

function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}

export function getMilliSeconds(startDate: Date, endDate: Date):number{
  if(!startDate)
  {
    return 0;
  }

  if(!endDate || endDate < startDate)
  {
    endDate = new Date();//now
  }

  return endDate.valueOf() - startDate.valueOf();
}

export function getSeconds(startDate: Date, endDate: Date): number 
{
  return Math.floor(getMilliSeconds(startDate, endDate) / 1000);
}

export function getDuration(startDate: Date, endDate: Date): string 
{
  if(!startDate)
  {
    return "";
  }

  var duration = getMilliSeconds(startDate, endDate);
  return (convertMsToTime(duration));
}

export function convertMsToTime(milliseconds: number): string 
{
  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  let result:string;

  if(hours === 0)
  {
    result = `${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
  }
  else
  {
    result = `${padTo2Digits(hours)}:${padTo2Digits(minutes)}`;
  }

  return result;
}

export function isJsonString(jsonString: string): boolean {
  try {
    var json = JSON.parse(jsonString);
    return (typeof json === 'object');
  } catch (e) {
    return false;
  }
}

export function isValidDate(dateString: string): boolean {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) {
    return false;  // Invalid format
  }
  var d = new Date(dateString);
  var dNum = d.getTime();
  if (!dNum && dNum !== 0) {
    return false; // NaN value, Invalid date
  }
  return d.toISOString().slice(0, 10) === dateString;
}

export function bytesToText(bytes: number | undefined): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === undefined) return '';
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export function CopyToClipboard(text:string): MethodResult<boolean>
{
  let result = new MethodResult<boolean>();
  try 
  {
    vscode.env.clipboard.writeText(text);
    result.isSuccessful = true;
  } 
  catch (error:any) 
  {
    result.isSuccessful=false;
    showErrorMessage('CopyToClipboard Error !!!', error);
  }
  return result;
}

export function CopyListToClipboard(textList:string[]): MethodResult<boolean>
{
  let text: string = "";
  for(var t of textList)
  {
    if(t)
    {
      text += t + "\n";
    }
  }
  
  return CopyToClipboard(text);
}