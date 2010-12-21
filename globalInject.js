var LikeFMInject;
var callback;
var LikeFM = {};
// Check if there is a token exchange message
if (document.getElementById('LikeFMTokenAuthenticated')) {
    // Request session
    safari.self.tab.dispatchMessage("getSession",true);
} else {
    // If EXTENSION is not linked, inject a notice bar into the DOM with link
    function supremeCommand(msgEvent) {
        if (msgEvent.name === "promptLink") {
            // No session exists
            function goToLinkPage() {
                safari.self.tab.dispatchMessage("link",true);
            }
            if (!document.getElementById("LikeFMNotice")) {
                var notice = document.createElement('div');
                notice.setAttribute('id','LikeFMNotice');
                notice.style.position = "fixed";
                notice.style.top = 0;
                notice.style.width = "100%";
                notice.style.zIndex = "1001";
                notice.style.background = "#dfdfdf";
                notice.style.borderTop = "1px solid #f2f2f2";
                notice.style.borderBottom = "1px solid #8e8e8e";
                notice.style.fontSize = "0.9em";
                notice.style.fontFamily = "helvetica";
                notice.innerHTML = '<div style="float:left;padding:.4em" ><img style="vertical-align:bottom" src="http://like.fm/img/like_small.png" /> Like.fm for Safari (click to dismiss)</div><div style="float:right">You have not linked an account to this extension. Songs you play will not be sent to Like.fm. <input type="button" id="link-account" value="Link my account" /></div>';
                document.body.insertBefore(notice,document.body.firstChild);
                document.getElementById("link-account").onclick = goToLinkPage;
                notice.onclick = function() {
                    notice.style.display = "none";
                };
            }
        }
    }

    safari.self.addEventListener("message", supremeCommand, false);

    safari.self.tab.dispatchMessage("checkSession",true);

    safari.self.tab.dispatchMessage("clearTrack",true);
}

if (window.location.host.indexOf("youtube.com") > -1) {
    
    function determineAndSendTrack(type) {
       if (document.getElementById("watch-description")) {
            var nodes = document.getElementById("watch-description").childNodes;
            var trackEl;
            var track = {};

            track.lsource = 'YouTube';
            track.source = 'P';
            
            for (var i in nodes) {
                if (nodes[i].textContent && i == nodes.length - 2) {
                    if (nodes[i].childNodes && nodes[i].childNodes.length > 1)
                        trackEl = nodes[i].childNodes[nodes[i].childNodes.length-2];
                }
            }

            if (trackEl && trackEl.childNodes[1].getAttribute("class") == "master-sprite music-note") {
                var trackStr = trackEl.childNodes[3].textContent.split(" - ",2);
                track.title = trackStr[1];
                track.artist = trackStr[0];
                track.type = type;

                // Send message to background process
                safari.self.tab.dispatchMessage("track",track);
            } else if (document.getElementById("eow-category").childNodes[0].textContent.match(/Music|Musik|Música|Musika|Musique|Glazba|Musica|Zene|Muziek|Musikk|Muzyka|Музыка|Hudba|Musiikki|Μουσική|Музика|מוסיקה|संगीत|音乐|音樂|音楽|음악/i)) { // English (both), Dansk, Deutsh, Espangnol (both), Filipino, Francais, Hrvatski, Italiano, Magyar, Nederlands, Norsk, Polski, Portugues (both), Pyccĸий, Slovenský, Suomi, Svenska, Čeština, Ελληνικά, Српски, עברית, हिन्द, 中文 (both), 日本語, 한국어
                track.query = document.getElementById("eow-title").textContent;
                track.type = type;
                // Send message to background process
                safari.self.tab.dispatchMessage("track",track);
            }
        }
    }
    LikeFMInject = function () {
        // Comm link with content script
        trackEvent = document.createEvent('Event');
        trackEvent.initEvent('myTrackEvent', true, true);

        window['onYouTubePlayerReady'] = function(){
            document.getElementById("movie_player").addEventListener("onStateChange",'fireTrackEvent');
        };
    };

    callback = function(newState) {
        if (newState == 1) {
           determineAndSendTrack('touch');
        } else if (newState == 0) {
           determineAndSendTrack('finish');
        }
    };

    injectHooks(LikeFMInject,callback);
    
} else if (window.location.host.indexOf("pandora.com") > -1) {
    LikeFMInject = function () {
        // Comm link with content script
        trackEvent = document.createEvent('Event');
        trackEvent.initEvent('myTrackEvent', true, true);

        Pandora.setEventHandler("SongPlayed", function(songData) {
            fireTrackEvent({title:songData.songName,artist:songData.artistName,type:'touch'});

        });
        Pandora.setEventHandler("SongEnded", function(songData) {
            fireTrackEvent({title:songData.songName,artist:songData.artistName,type:'finish'});
        });
    };

    // Below is in the context of content script

    callback = function(track) {
        track.lsource = 'Pandora';
        track.source = 'E';

        safari.self.tab.dispatchMessage("track",track);
    };

    injectHooks(LikeFMInject,callback);

} else if (window.location.host.indexOf("meemix.com") > -1) {
    LikeFMInject = function () {
        // Comm link with content script
        trackEvent = document.createEvent('Event');
        trackEvent.initEvent('myTrackEvent', true, true);

        MeeMixPlayer.setEventHandler("SongPlaying", function(songData){
            fireTrackEvent({title:songData.title,artist:songData.artist,type:'touch'});
        });

        MeeMixPlayer.setEventHandler("SongFinishing", function(songData){
            fireTrackEvent({title:songData.title,artist:songData.artist,type:'finish'});
        });
    };

    // Below is in the context of content script

    callback = function(track) {
        track.lsource = 'Meemix.com';
        track.source = 'E';

        safari.self.tab.dispatchMessage("track",track);
    };

    injectHooks(LikeFMInject,callback);

} else if (window.location.host.indexOf("grooveshark.com") > -1) {
     LikeFMInject = function() {
        // Comm link with content script
        trackEvent = document.createEvent('Event');
        trackEvent.initEvent('myTrackEvent', true, true);

        function bind() {
            try {
            window.Grooveshark.setSongStatusCallback("fireTrackEvent");
            } catch (e) {
                setTimeout(bind,1200);
            }
        }
        bind();
    }

    callback = function(data) {
        var track = {};
        var percent = data.song.position/data.song.calculatedDuration;
        track.lsource = 'Grooveshark';
        track.source = 'P';
        if (data.song.position == 0
            && (
                (LikeFM.currentTrack
                    && (data.song.songName != LikeFM.currentTrack.title || data.song.artistName != LikeFM.currentTrack.artist)
                ) || !LikeFM.currentTrack
            )
        ) {
           track.title = data.song.songName;
           track.artist = data.song.artistName;
           track.album = data.song.albumName;
           track.type = 'touch';
           safari.self.tab.dispatchMessage("track",track);
           LikeFM.currentTrack = track;

        } else if (data.status == 'playing' && percent > 0.8 && LikeFM.currentTrack) {
           track.title = data.song.songName;
           track.artist = data.song.artistName;
           track.album = data.song.albumName;
           track.type = 'finish';

           safari.self.tab.dispatchMessage("track",track);
           LikeFM.currentTrack = null;
        }
    };

    injectHooks(LikeFMInject,callback);

}

function injectHooks(hooks,callback) {
    function fireTrackEvent(data) {
        var hiddenDiv = document.getElementById('LikeFMComm');
        hiddenDiv.textContent = JSON.stringify(data);
        hiddenDiv.dispatchEvent(trackEvent);
    }

    // Below is in the context of content script

    // Injected script
    if (!document.getElementById("LikeFMInject")) {
        var script = document.createElement('script');
        script.setAttribute('id','LikeFMInject');
        script.appendChild(document.createTextNode('var trackEvent;' + fireTrackEvent + '('+ hooks +')();'));
        document.documentElement.getElementsByTagName("HEAD")[0].appendChild(script);
    }

    // Comm link medium div
    if (!document.getElementById("LikeFMComm")) {

        var comm = document.createElement("div");
        comm.setAttribute("id","LikeFMComm");
        comm.style.display = 'none';

        document.getElementsByTagName('body')[0].appendChild(comm);

        // Comm link with injected script
        comm.addEventListener('myTrackEvent', function() {
            var data = JSON.parse(comm.textContent);
            callback(data);
        },true);
    }
}