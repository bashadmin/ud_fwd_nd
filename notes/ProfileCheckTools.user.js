// ==UserScript==
// @name         Profile Check Tools
// @namespace    https://toptal.com
// @version      0.1
// @description  This script adds helpers for easier and faster Profile checks
// @author       Secret Panda
// @match        https://www.toptal.com/platform/staff/talents/*
// @icon         https://www.google.com/s2/favicons?domain=undefined.
// @grant        none
// ==/UserScript==


// This is experimental. Very experimental. If it breaks you need to disable or fix it by yourself. Godspeed.
// It's 75% legal. Don't brag you have it. Keep in under the radar. 👀

// Helper function to call our hook when element appears
// Seems we could not add it to separate file and it wasnt good idead to link to gist so it's
// pasted here
/*--- waitForKeyElements():  A utility function, for Greasemonkey scripts,
    that detects and handles AJAXed content.
    Usage example:
        waitForKeyElements (
            "div.comments"
            , commentCallbackFunction
        );
        //--- Page-specific function to do what we want when the node is found.
        function commentCallbackFunction (jNode) {
            jNode.text ("This comment changed by waitForKeyElements().");
        }
    IMPORTANT: This function requires your script to have loaded jQuery.
*/
function waitForKeyElements (
    selectorTxt,    /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */
    actionFunction, /* Required: The code to run when elements are
                        found. It is passed a jNode to the matched
                        element.
                    */
    bWaitOnce,      /* Optional: If false, will continue to scan for
                        new elements even after the first match is
                        found.
                    */
    iframeSelector  /* Optional: If set, identifies the iframe to
                        search.
                    */
) {
    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined")
        targetNodes     = $(selectorTxt);
    else
        targetNodes     = $(iframeSelector).contents ()
                                           .find (selectorTxt);

    if (targetNodes  &&  targetNodes.length > 0) {
        btargetsFound   = true;
        /*--- Found target node(s).  Go through each and act if they
            are new.
        */
        targetNodes.each ( function () {
            var jThis        = $(this);
            var alreadyFound = jThis.data ('alreadyFound')  ||  false;

            if (!alreadyFound) {
                //--- Call the payload function.
                var cancelFound     = actionFunction (jThis);
                if (cancelFound)
                    btargetsFound   = false;
                else
                    jThis.data ('alreadyFound', true);
            }
        } );
    }
    else {
        btargetsFound   = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj      = waitForKeyElements.controlObj  ||  {};
    var controlKey      = selectorTxt.replace (/[^\w]/g, "_");
    var timeControl     = controlObj [controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound  &&  bWaitOnce  &&  timeControl) {
        //--- The only condition where we need to clear the timer.
        clearInterval (timeControl);
        delete controlObj [controlKey]
    }
    else {
        //--- Set a timer, if needed.
        if ( ! timeControl) {
            timeControl = setInterval ( function () {
                    waitForKeyElements (    selectorTxt,
                                            actionFunction,
                                            bWaitOnce,
                                            iframeSelector
                                        );
                },
                300
            );
            controlObj [controlKey] = timeControl;
        }
    }
    waitForKeyElements.controlObj   = controlObj;
}
// END of outside helper function

// Generate a link
const generateLink = (text, href) => {
    let element = document.createElement('a');
    element.innerHTML = `<a href="${href}" target="_blank">${text}</a>`;
    return element;
}

function gatherEmailDomain() {
    let email = $("div.details-label:contains('Email')").next().find('span').text();

    if (!email) return [null, null];
    
    const atAddr = email.split("@")[1]
    const hostnameArr = atAddr.split('.');
    const tld = hostnameArr.pop();
    const domain = hostnameArr.pop();
    return [`${domain}.${tld}`, email];
}

function gatherWebsiteDomain() {
    let website = $("div.details-label:contains('Website')").next().find('a').text();
    let baseName = null;
    try {
        const hostnameArr = (new URL(website)).hostname.split('.');
        const tld = hostnameArr.pop();
        const domain = hostnameArr.pop();
        baseName = `${domain}.${tld}`
    } catch (error) {
        //this handles empty result too
    }
    
    return [baseName, website];
}

function gatherLastLoginInformation() {
    let lastLoginInfo = $("div.details-label:contains('Last login')").next().find('span').data('tooltip');

    if (!lastLoginInfo) return [false, false];

    let [_, ip, __, loc, ___] = lastLoginInfo.split("**");
    return [ip, loc];
}

function addProfileTools() {
    //otherwise that listeners goes into loop and never finishes
    try {
        actualAdd();
    } catch (error) {
        console.log("Error adding Profile tools", error)
    }
}
function actualAdd() {
    let [ip, loc] = gatherLastLoginInformation();
    let [emailDomain, email] = gatherEmailDomain();
    let [websiteDomain, website] = gatherWebsiteDomain();

    let ipInfo = $("span:contains('Application Info')").first().parent().parent().find("div.details-label:contains('Ip')");
    if (ipInfo.size() == 0) {
        //let's see if it's the No Data popup
        let noData = $("span:contains('Application Info')").first().parent().parent().find("p:contains('data is unavailable')");
        //oops? new layout maybe
        if (noData.size() == 0) return;

        if (emailDomain) addExtraInfo(noData, '@ TLD - ', `${emailDomain} - ${email}`, `https://who.is/whois/${emailDomain}`)
        if (websiteDomain) addExtraInfo(noData, 'TLD - ', `${websiteDomain} - ${website}`, `https://who.is/whois/${websiteDomain}`)
        if (ip) addExtraInfo(noData, 'Login IP - ', `${ip} - ${loc}`, `https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${ip}`)
        return;
    }

    //not sure if there's option where there's no IP field? haven't seen it
    let ipText = ipInfo.first().next().text();
    if(ipText === "") return;

    let ipWrapper = ipInfo.parent().parent();
    
    if (emailDomain) addExtraInfo(ipWrapper, '@ TLD - ', `${emailDomain} - ${email}`, `https://who.is/whois/${emailDomain}`)
    if (websiteDomain) addExtraInfo(ipWrapper, 'TLD - ', `${websiteDomain} - ${website}`, `https://who.is/whois/${websiteDomain}`)
    if (ip) addExtraInfo(ipWrapper, 'Login IP - ', `${ip} - ${loc}`, `https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${ip}`)
    addExtraInfo(ipWrapper, 'Ip - ', ipText, `https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${ipText}`)
    ipWrapper.remove(); //remove duplicated Ip

}

function addExtraInfo(addAfter, label, valueLabel, link) {

    let labelDiv = $('<div />', {"class": "details-label", text: label})
    let a = generateLink('⁉️', link);
    $(a).appendTo(labelDiv);

    let valueDiv = $('<div />', {"class": "details-value", text: valueLabel});
    let rowWrapper = $('<div />', {"class": "details is-full"});
    rowWrapper.append(labelDiv).append(valueDiv);

    $('<div />', {
        "class": "panel_list-item",
        style: 'border: 1px solid blueviolet;'
    }).append(rowWrapper).insertAfter(addAfter);
}

(function() {
    'use strict';
    waitForKeyElements ("span:contains('Application Info')", addProfileTools);
})();
