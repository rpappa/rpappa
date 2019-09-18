let print = {
    ua: navigator.userAgent,
    platform: navigator.platform
}

let printString = JSON.stringify(print, null, '\t');

document.getElementById('output').innerText = printString;