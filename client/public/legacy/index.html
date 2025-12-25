<html xmanifest="index.manifest">
<head>
<meta http-equiv="content-type" content="text/html; charset=UTF-8">

<title>Bible Memory</title>
<link rel="apple-touch-icon" href="bible.png"/>
<link rel="shortcut icon" href="bible.ico" />
<link rel="stylesheet" href="css/index.css" type="text/css" />

</head>

<script language="javascript" type="text/javascript" src="js/jquery.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.scrollTo-min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.contextmenu.r2.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.shortkeys.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.cookie.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.date.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.json.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jstorage.min.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.tablesorter.js"></script>
<script language="javascript" type="text/javascript" src="js/jquery.quicksearch.js"></script>


<script type="text/javascript">

//TO DO:
// - write API spec & write to Dan, Bible2Heart, SwordScript
// - write up HMI spec & get verse lists working
// - Think about allowing provision for pictures such as in FAST.BT  (inline?)
// - First-letters upper-case vs sentence-case - make it a toggle-button that gets remembered either locally or as cookie  (maybe use first-letters button itself to toggle)
// - remove full-screen app code so it works properly on iPhone until truly offline
// - try creating manifest file - see if it works simply without cached updates (user select refresh instead)
// - (Tell jason and cristian to user main code base)
// - Change code to base everything off verse_ids.  (With time-stamp-based synching capability)
// - json.php replacement uses: 'all' (except userids), 'dailyreview' (all data + 0-2month content + 'l' or 'd's), 'contentlist=1,32,30' (specified content only) 
// - When review initiated, parse verse-list and create review-list xrefering verse_id. 
// - Change info or background based on review frequency
// - Add different review-types (ref/verse, verse/ref, specific tags, etc)
// - Add progress-bar? (vs x/y statistic)
// - Add AJAX progress logging, and incorporate this into review-list creation
// - Make a true offline web-app with offline/online mode
// - register hidinmyheart.com / bible-memory.com

//Notes: 
// - may want to use heavier datejs library if necessary - www.datejs.com
// - Refer re iphone dev: 
//		*	- http://www.thecssninja.com/javascript/how-to-create-offline-webapps-on-the-iphone
//			- http://developer.apple.com/safari/library/documentation/iphone/conceptual/safarijsdatabaseguide/introduction/introduction.html
// 		- http://www.slideshare.net/Berttimmermans/iphone-offline-webapps
//
//	- Refer to the following website for excellent strategy for offline app synchronisation:
//			- http://github.com/wycats/rack-offline
//
// - Mobile web design principles & templates
//			- http://wiki.forum.nokia.com/index.php/Designing_appealing_mobile_web_pages
//
// - "The Engine used to have:" <meta name="viewport" content="width=425">
// - Note: had to comment out the following lines in .git/hooks/pre-commit - refer: http://www.dont-panic.cc/capi/2007/07/13/git-on-windows-you-have-some-suspicious-patch-lines/
//		#	    if (/\s$/) {
//		#		bad_line("trailing whitespace", $_);
//		#	    }


// - According to JQuery.Browser() help, should test for capabilities rather-than exact browsers.
// - Excellent resource regarding how to PROPERLY change CSS based on browser width - http://css-tricks.com/resolution-specific-stylesheets/
// - Another EXCELLENT visually-appealing resource to designing websites that CSS-size dynamically is: http://lessframework.com and http://framelessgrid.com 


//<meta name="apple-mobile-web-app-capable" content="yes" />
//<html manifest="bible.memory.manifest">

// # html 5 application cache - offline access
// text/cache-manifest			manifest


var allVerses = {!! json_encode($verses) !!};
var verses = [];

//Define context classes
function Context(init) {
	if (typeof(init) == 'string')	//normal mode assignment
		this.mode = init;		
	else {								//assume that we're copying from another Context object or an Array
		this.mode = init.mode;		//if init doesn't contain mode, then it's invalid - therefore manually assign it to force an error if it doesn't exist
		for (x in init)
			this[x] = init[x];
	} 
};
function ContextStack(loadfrom) {
	this.updateCurrent = function() {
		if (this.stack.length==0)
			this.push( new Context("mainmenu") );	//default context if none already exists
		this.current = this.stack[this.stack.length-1];
		return this.current;
	}; 
	this.set = function(newcontext) { 
		this.updateCurrent(); 							//in case it's empty to begin with
		this.stack[this.stack.length-1] = newcontext;
		this.updateCurrent(); 
	};
	this.setMode = function(newmode) {
		this.set( new Context(newmode) );
	};
	this.push = function(newcontext) { 
		this.stack.push(newcontext);
		this.updateCurrent(); 
	};
	this.pushMode = function(newmode) {
		this.push( new Context(newmode) );
	};
	this.pop = function() {
		this.updateCurrent(); 							//in case it's empty to begin with
		tmp = this.stack.pop();
		this.updateCurrent(); 
		return tmp;
	};
	//constructor code
	this.stack = [];
	if (loadfrom !== undefined)						//if constructor was passed a parameter - load it
		for (i=0; i<loadfrom.stack.length; i++) 
			this.stack.push( new Context(loadfrom.stack[i]) );
	this.updateCurrent();	//first initialisation
};

var context = new ContextStack();
context.setMode("loading");


/////////////////////////////////////////

$(document).ready(function() {
	//Browser-specific CSS insertion
	if ((detectBrowser() == 'iphone') || (detectBrowser() == 'android')) {
		$('head').append('<link rel="stylesheet" href="css/index.iphone.css" type="text/css" />');
		$('head').append('<meta name = "viewport" content = "user-scalable=no,width=device-width" />');
	}
	if (detectBrowser() == 'msie')
		$('head').append('<link rel="stylesheet" href="css/index.msie.css" type="text/css" />');

	
	//Initialise shortcut keys
	$(document).shortkeys({
		'n':          function () { if (context.current.mode == 'review') next(); },
		'Space':      function () { if (context.current.mode == 'review') advance(); },
		'p':          function () { if (context.current.mode == 'review') prev(); },
		'h':          function () { if (context.current.mode == 'review') add_hint(); },
		'f':          function () { if (context.current.mode == 'review') showFirstLetters(); },
		's':          function () { dataLocalSave(); },
		'l':          function () { dataLocalLoad(); },
		'q':          function () { alert($.toJSON($.jStorage.get('context'))); },
		'c':          function () { $('head').append('<link rel="stylesheet" href="css/index.iphone.css" type="text/css" />'); },
		'v':          function () { $('head').append('<link rel="stylesheet" href="css/index.firefox.css" type="text/css" />'); }
	});
    context.setMode("mainmenu");
	selectRandomVerses(); 
	context.pushMode("verselist"); 
	context.pushMode("review"); 
	context.current.n = 1; // Counter
	context.current.submode = 'reference';		//valid values are: reference, content, hints, firstletters
    refreshPage();
});

// http://www.hand-interactive.com/resources/detect-mobile-javascript.htm
function detectBrowser() {
	var browser = 'unknown';
	if ($.browser.webkit) {
		browser = 'webkit';
		if (/iphone/i.test(navigator.userAgent))
			browser = 'iphone';
		if (/android/i.test(navigator.userAgent))
			browser = 'android';
	}
	if ($.browser.msie) 
		browser = 'msie';
	if ($.browser.mozilla) 
		browser = 'mozilla';
	return browser;
}

function mobileBrowser() {
	browser = detectBrowser();
	if (browser == 'iphone')
		return true;
	return false;
}


function selectAllVerses() {
	verses = allVerses.slice();	//Create a (shallow) clone of the allVerses array
}

function selectRandomVerses() {
	verses = []
	for (var i=0; i<allVerses.length; i=i+1) {
		var freq = allVerses[i].review_cat;
		if (freq == 'auto') {
            var started_days = calcStartedDays(allVerses[i].started_at);
			freq = autoReviewFreq(started_days);
        }
		if ((freq == "l") || (freq == "d"))
			verses.push(allVerses[i]);
		if (freq == "w") {
			if (Math.floor(Math.random()*7) == 0)  		//1-in-7 probabililty
				verses.push(allVerses[i]);
		}
		if (freq == "m") {
			if (Math.floor(Math.random()*30) == 0)  		//1-in-7 probabililty
				verses.push(allVerses[i]);
		}

	}
}

function dataLocalLoad() {
// 	var t = localStorage.verses;
	if (localStorage.verses === null) {
		verses = [];
		alert('failed to load local');
		return false;		//failed to load local data
	} else {
		verses = $.evalJSON(localStorage.verses);
		context = new ContextStack( $.evalJSON(localStorage.context) );
		refreshPage();
		return true;
	}
// 	
// 	verses = $.jStorage.get('verses', []);
// 	if (verses.length > 0) {
// 		var ttt = new ContextStack();
// 		var tmpcontext = $.jStorage.get('context', ttt);
// 		context = new ContextStack(tmpcontext);
// 		refreshPage();
// 		return true;
// 	} else {
// 		alert('failed to load local');
// 		return false;		//failed to load local data
// 	}
}

function dataLocalSave() {
	localStorage.verses = $.toJSON(verses);
	localStorage.context = $.toJSON(context);
// 	$.jStorage.set('verses', verses.slice(0));				//store a copy of the verses array
// 	$.jStorage.set('context', new ContextStack(context));	//store a copy of the context stack (if context is stored directly, the local storage object remains linked to reference - this causes problems)
}

function dataLocalClear() {
	localStorage.clear();
// 	$.jStorage.flush();
}

function startReview() {
	context.setMode("review"); 
	context.current.n = 1; // Counter
	context.current.submode = 'reference';		//valid values are: reference, content, hints, firstletters
	refreshPage();
	setTimeout(function(){ refreshPage(); }, 200);
}

function showVerseList() {
	context.pushMode("verselist"); 
	refreshPage();
	setTimeout(function(){ refreshPage(); }, 200);
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

//converts simple '\r\n' or '\n' text to html paragraphs
//optional set br=true to use '<br>' instead of default '<p>' format
function htmlParas(text, br) {
	text = htmlLeadingSpaces(text);
	if (br == true) {
		text = text.replace(/\r\n/g, '<br />');
		text = text.replace(/\n/g, '<br />');
		return text;
	} else {
		text = text.replace(/\r\n/g, '</p><p>');
		text = text.replace(/\n/g, '</p><p>');
		return '<p>' + text + '</p>';
	}
}

function htmlLeadingSpaces(text) {
	function replacer(str, p1, p2, offset, s) {
		result = '\n';
		for (var i=1; i<=p1.length; i++)
			result += '&nbsp;';  
	  return result;  
	}  
	return text.replace(/\n(\x20+)/g, replacer); 
}

function add_hint() {
	if (context.current.submode != 'hints') {
		context.current.submode = 'hints';
		context.current.hints = 3;
	} else
		context.current.hints += 1; 
	refreshPage();
}

function showFlashCards() {
	t = context.current.n;
	context.pushMode("flashcards");
	context.current.n = t;
	context.current.level = 10;
	refreshPage();
}

function showFirstLetters() {
	context.current.submode = 'firstletters';
	refreshPage();
}

function prev() {
	context.current.n = context.current.n - 1;
	if (context.current.n < 1)
		context.current.n = 1;
	context.current.submode = 'reference';
	refreshPage();
}

function next() {
	context.current.submode = 'reference';
	context.current.n = context.current.n + 1;
	if (context.current.n > verses.length+1)
		context.current.n = verses.length+1;
	refreshPage();
}

function advance() {
	if (context.current.submode != 'content') {
		context.current.submode = 'content';
		refreshPage();
	} else 
		next();
}

function refreshPage() {
	contextMenuOptions = {
		bindings: {
			'flashcards': function(t) {
				showFlashCards();
			},
			'mainmenu': function(t) {
				if (confirm('Cancel review and return to main menu?') == true) {
					context.pop();
					context.pop();
					context.pop();
					context.setMode("mainmenu");
					refreshPage();
				}
			},
			'lookupchapter': function(t) {
				chapter = cv.reference.replace(/:.+/, "");
				window.open('http://mobile.biblegateway.com/passage/index.php?version=KJV&search=' + chapter);
			},
			'back': function(t) {
				context.pop();
				refreshPage();
			},
			'remindermeditate': function(t) {
				t = context.current.n;
				context.pushMode("remindermeditate");
				refreshPage();
			},
			'reminderapply': function(t) {
				t = context.current.n;
				context.pushMode("reminderapply");
				refreshPage();
			}
// 			'cancel': function(t) {
// 			}
		},
		menuStyle : {
			'width': '200px'
		},
		itemStyle: {
			'font-size' : '150%'
		},
		PosX: $('#master').offset().left + 50, 
		PosY: 60,
		overlay: true
	};

	if (context.current.mode == 'loading') {
		$('#master').empty().append( $('#tLoading').clone() );
	}
	if (context.current.mode == 'mainmenu') {
		$('#master').empty().append( $('#tMainMenu').clone() );
	}
	if (context.current.mode == 'verselist') {
		$('#master').empty().append( $('#tVerseList').clone() );
		var html = "";
		for (var i=0; i<verses.length; i=i+1) {
			var d = $('<div></div>');
			var t = "<b>" + verses[i].reference + "</b> - " + verses[i].content;
			d.html(t);
			d.attr('title', i+1);
		   d.click(function(event){ 
				event.stopPropagation();
				context.pushMode("review"); 
				context.current.n = parseInt($(this).attr('title'));
				context.current.submode = 'reference';		//valid values are: reference, content, hints, firstletters
				refreshPage();
				setTimeout(function(){ refreshPage(); }, 200);
			});
			$('#verselist').append(d);

//          $("#tVerseList").tablesorter({ 
// 				sortList: [[0,0]] 
// 				//sortForce: [[0,0]] 
// 			});
// 
// 			$('div#verselist div').quicksearch({
// 				position: 'before',
// 				attached: 'div#verselist',
// 				labelText: 'Search verses'
// 			});
// 			
// 			$("input:text:visible:first").focus();
			
// 			html += t + "<br>\n";
		}
// 		$('#verselist').html(html);
	}
	if (context.current.mode == 'remindermeditate') {
		$('#master').empty().append( $('#tReminderMeditate').clone() );
	}
	if (context.current.mode == 'reminderapply') {
		$('#master').empty().append( $('#tReminderApply').clone() );
	}
	if (context.current.mode == 'review') {
		cv = verses[context.current.n-1];	//cv = shortcut to current verse
		$('#master').empty().append( $('#tReview').clone() );
		$('#myh1').contextMenu('myMenuReview', contextMenuOptions);
	   $("#versebox").unbind('click');
	   $("#versebox").click(function(event){
	   	advance();
	   });
		if (context.current.n > verses.length) {
			$('#versebox').html('Review finished for today!<p />Please wait one moment while we update your information...');
		}
		$('#versebox_ref').html(cv.reference);
		//Content text
		content_text = '';
		if (context.current.submode == 'firstletters')
			content_text = firstLetters(cv.content);
		else if (context.current.submode == 'content')
			content_text = cv.content;
		else if (context.current.submode == 'hints')
			content_text = hintWords(cv.content, context.current.hints)
		if (content_text == '')
			content_text = '&nbsp;';									//<p>&nbsp; - Hack for Safari - otherwise div height changes if <p> doesn't exist
		$('#versebox_content').html(htmlParas(content_text));

		
		//started text
		started_days = calcStartedDays(cv.started_at);
		started_text = timeLapseDescriptor(started_days);
		
		//review_cat_text
		if (cv.review_cat == 'auto') {
			review_cat_text = reviewText(autoReviewFreq(started_days));
		} else {
			review_cat_text = '<font color=red>' + reviewText(cv.review_cat) + '</font>';
		}
		$('#versebox_review_cat').html(review_cat_text);
		
		
		$('#versebox_tags').html(formatTags(cv.tags));
		$('#versebox_progress').html(context.current.n + '/' + verses.length);
		$('#versebox_starteddate').html(started_text);
		//set tool-tip for most browsers and on-click for iPhone - MAYBE DELETE LATER???
		$('#versebox_starteddate').attr('title', cv.started_at);
	   $('#versebox_starteddate').unbind('click');
	   $('#versebox_starteddate').click(function(event){ 
		  	event.stopPropagation();
			alert($(this).attr('title')); 
		});
	}
	if (context.current.mode == 'flashcards') {
		$('#master').empty().append( $('#tFlashCards').clone() );
		$('#myh1').contextMenu('myMenuFlashCards', contextMenuOptions);
		
		//Update the html content
		cv = verses[context.current.n-1];	//cv = shortcut to current verse
		var fcc = generateFlashCardContent(cv.reference, cv.content, context.current.level);
		$('#versebox_ref').html(fcc.reference_text);
		$('#versebox_content').html(htmlParas(fcc.content_text));
	   $("#versebox").unbind('click');
	   $("#versebox").click(function(event){
	   	refreshPage();
	   });
	   $("#versebox span").click(function(event){
			event.stopPropagation(); 
			$(this).css("color", "red");  
		});
	}

	$.scrollTo( $('h1'), 0, {margin:true } );
	}




function wordSplit(str, allow_numbers) {
	function matchIndex(MatchResult) {
		if (MatchResult == null)
			return -1;
		else
			return MatchResult.index; 
	}
	// Optional parameter handling (allow_numbers)
	if (allow_numbers === undefined)
		allow_numbers = false;
	// RegExp Initialization
	if (allow_numbers)
		var rWordStart = new RegExp('[A-Za-z0-9]');		// A valid word must start with a letter (or a number if allow_numbers=true)
	else
		var rWordStart = new RegExp('[A-Za-z]');			// A valid word must start with a letter
	var rWordStop = new RegExp('[^A-Za-z0-9\'\-]');		// Once started, a word can contain letters, numbers, single-apostraphe's and hyphens
	// General Initialization
	var a = new Array();
	var next = 0;
	// Determine if first part of the string is a word or not
	var isWord = (matchIndex(rWordStart.exec(str)) == 0);
	// Main loop
	while (str.length > 0) {
		//Search for next split
		if (isWord)
			next = matchIndex(rWordStop.exec(str));	//Search for end of word
		else
			next = matchIndex(rWordStart.exec(str));	//Search for start of word
		if (next < 0)
			next = str.length;								//Handle 'not found' result correctly
		//Add next part to the array as an object  
		var t = new Object();
		t.isWord = isWord;
		t.str = str.substring(0, next);
		a.push(t);
		//Prepare for the next part
		str = str.substring(next);
		isWord = !isWord;
	}
	return a;
}

function firstLetters(str) {
	var a = wordSplit(str);
	var result = '';
	for (var i=0; i<a.length; i++) {
		if (a[i].isWord)
			result += a[i].str.substring(0,1);
		else
			if (a[i].str != ' ')
				result += a[i].str;
	}
	return result; 
}

function hintWords(str, num_hints) {
	if (str=='') return '';  //fixme
	var a = wordSplit(str);
	var result = '';
	for (var i=0, h=0; i<a.length, h<num_hints; i++) {
		result += a[i].str;
		if (a[i].isWord) 
			h++;
	}
	return result; 
}

function formatTags(tags) {
	var pre = '';
	var tagstring = '';
	var tag_array = tags.split(',');
	for (x in tag_array) {
		var t = tag_array[x].split('=', 2);
		t[0] = $.trim(t[0]);
		t[1] = $.trim(t[1]);
		tagstring += pre + t[0];
		if (t[1].length > 0)
			tagstring += '<small> (' + t[1] + ')</small>';
		pre = '<br />';
	}
	return tagstring;
}

function calcStartedDays(started_at) {
    if (started_at == null) 
        return 0;
	var dtToday = Date.fromString(new Date().asString('yyyy-mm-dd'), 'yyyy-mm-dd');
	var dtStarted = Date.fromString(started_at, 'yyyy-mm-dd');
	return Math.round( (dtToday-dtStarted) / (24*60*60*1000)); 
}

function autoReviewFreq(started_days) {
	var cDaysLearn = 7+1;
	var cDaysDaily = 7*4*2;
	var cDaysWeekly = 7*4*4;
	if (started_days < 0)
		return 'f';
	if (started_days < cDaysLearn)
		return 'l';
	if (started_days < cDaysDaily)
		return 'd';
	if (started_days < cDaysWeekly)
		return 'w';
	return 'm';
}

function reviewText(review_cat) {
	if (review_cat == 'f')
		return 'future';
	if (review_cat == 'l')
		return 'learn';
	if (review_cat == 'd')
		return 'daily';
	if (review_cat == 'w')
		return 'weekly';
	if (review_cat == 'm')
		return 'monthly';
	return review_cat;		// Just in case nothing else found
}

function timeLapseDescriptor(days, short_format) {
	var num, units;
	if (days > 2*365) {
		num = Math.floor(days/365)
		units = 'year';
	} else if (days > 12*7) {
		num = Math.floor(days/30.4);
		units = 'month';						//average month length is 30.4 days (simplistic estimate for larger months)
	} else if (days >= 8*7) {
		num = Math.floor(days/4/7);
		units = 'month';						//use four-week-based month estimate for 2-3 months
	} else if (days >= 2*7) {
		num = Math.floor(days/7);
		units = 'week';
	} else {
		num = days; 
		units = 'day';
	}
	// plural units if appropriate
	if (num > 1)
		units += 's';
	//Optional short format paramater handling 
	if (short_format === undefined)
		short_format = false;
	if (short_format)
		return num + units.substring(0,1);
	else
		return num + ' ' + units;
}



function updateFlashCards(level){
	context.current.level = level;
	refreshPage();
}

function generateFlashCardContent(reference, content, level){
	//Split the reference & content differently, then merge them into 'mywords'
	var myrefs = wordSplit(reference, true);
	var mycontent = wordSplit(content);
	var mywords = myrefs.concat(mycontent);
	//Count valid words
	countWords = 0;
	for (var i=0; i<mywords.length; i++) 
		if (mywords[i].isWord) 
			countWords++;
	//Flag which words should be hidden
	missingWords = Math.ceil(countWords * level/100);
	for (var i=0; i<mywords.length; i++)
		mywords[i].hidden = false;
	for (var m=0; m<missingWords; m++) {
		remainWords = countWords-m;
		var targetWord = Math.floor(Math.random()*remainWords+1);		//targetWord will be in range from 1 to remainWords
		var currentWord = 0;
		for (var i=0; i<mywords.length; i++) {
			if (mywords[i].isWord && !mywords[i].hidden) {
				currentWord++;
				if (currentWord == targetWord) {
					mywords[i].hidden = true;
					break;
				}
			} 
		}
	}
	// Split mywords back into myrefs and mycontent
	myrefs = mywords.slice(0, myrefs.length);
	mycontent = mywords.slice(myrefs.length);
	// Create result object
	var result = new Object();
	// Generate reference_text
	result.reference_text = '';
	for (var i=0; i<myrefs.length; i++) {
		if (myrefs[i].hidden == true)
			result.reference_text += '<span>' + myrefs[i].str + '</span>';
		else
			result.reference_text += myrefs[i].str;
	}
	// Generate content_text
	result.content_text = '';
	for (var i=0; i<mycontent.length; i++) {
		if (mycontent[i].hidden == true)
			result.content_text += '<span>' + mycontent[i].str + '</span>';
		else
			result.content_text += mycontent[i].str;
	}
	// Return result
	return result;
}

</script>

<body>
<div id='master'>
Loading - please wait...
</div>
<br><br><br><br><br><br><br><br>

<div class="contextMenu" id="myMenuReview">
    <ul>
      <li id="flashcards">Learn: Flash Cards</li>
      <li id="lookupchapter">Lookup Chapter</li>
      <li id="remindermeditate">Meditate Questions</li>
      <li id="reminderapply">Apply Questions</li>
      <li id="mainmenu">Main Menu</li>
    </ul>
</div>
<div class="contextMenu" id="myMenuFlashCards">
    <ul>
      <li id="back">Back to Review</li>
      <li id="mainmenu">Main Menu</li>
    </ul>
</div>
  
<div style='display:none;'>

<div id='tLoading'>
Loading - please wait...
</div>

<div id='tMainMenu'>
<h1>Main Menu</h1>
<a href="javascript:void()" name="link" onclick=" selectRandomVerses(); startReview(); ">Start Review - Daily</a><br>
<a href="javascript:void()" name="link" onclick=" selectAllVerses(); 	startReview(); ">Start Review - All</a><br>
<a href="javascript:void()" name="link" onclick=" selectRandomVerses(); showVerseList(); ">Show Verse List - Daily</a><br>
<a href="javascript:void()" name="link" onclick=" selectAllVerses(); 	showVerseList(); ">Show Verse List - All</a><br>
<a href="admin/verses">Verse Admin</a><br>
<a href="logout" name = "link" onclick=" event.preventDefault(); document.getElementById('logout-form').submit();">Logout</a>
	<form id="logout-form" action="logout" method="POST" style="display: none;">@csrf</form>
</div>

<div id='tVerseList'>

<div class='alignleft'><input value="Back" onclick="context.pop(); refreshPage(); " type="button"></div>
<h1 style="clear: top; text-align:center;" id="myh1">Verse List</h1>
<div id="verselist">
</div>
</div>

<div id='tReview'>
<div>
<div class='alignleft'><input value="Back" onclick="context.pop(); refreshPage(); " type="button"></div>
<div class='alignright'><input value="Next" onclick="next()" type="button"></div>
<div class='alignright'>&nbsp;&nbsp;</div>
<div class='alignright'><input value="Prev" onclick="prev()" type="button"></div>
<h1 style="clear: top; text-align:center;" id="myh1">Daily Review</h1>
<div style="clear: both;"></div>
</div>
<div id="versebox">
<div id="versebox_progress"></div>
<div id="versebox_ref"></div>
<div id="versebox_content"></div>
	<table id="versebox_details" ><tr><td id='versebox_review_cat'></td><td id='versebox_tags'></td><td id='versebox_starteddate'></td></tr></table>
</div>
<div class='alignleft'><input value="Hint" onclick=" add_hint(); " type="button"></div>
<div class='alignright'><input value="First Letters" onclick=" showFirstLetters(); " type="button"></div>
<div class='alignX' style="clear: top; text-align:center; "><input value="Flash Cards" onclick=" showFlashCards(); " type="button"></div>
</div>

<div id='tFlashCards'>
<div class='alignleft'><input value="Back" onclick="context.pop(); refreshPage(); " type="button"></div>
<div class='alignright'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<h1 style="clear: top; text-align:center;" id="myh1">Flash Cards</h1>
<div id="main">
<div id="flashcard_options">
<a href="javascript:void()" name="link" onclick="updateFlashCards(0)">Show Verse</a> | 
<a href="javascript:void()" name="link" onclick="updateFlashCards(10)">Beginner</a> | 
<a href="javascript:void()" name="link" onclick="updateFlashCards(25)">Intermediate</a> | 
<a href="javascript:void()" name="link" onclick="updateFlashCards(45)">Advanced</a> | 
<a href="javascript:void()" name="link" onclick="updateFlashCards(100)">Memorized</a>
</div></div>
<div id="versebox">
<div id="versebox_ref"></div>
<div id="versebox_content"></div>
</div>
</div>

<div id='tReminderMeditate'>
<div class='alignleft'><input value="Back" onclick="context.pop(); refreshPage(); " type="button"></div>
<div class='alignright'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<h1 style="clear: top; text-align:center;" id="myh1">Questions for Meditation</h1>
<p>Ask yourself the following questions about the verse: </p>
<ul>
	<li>Who is speaking in the verse, and to whom?</li>
	<li>What is he trying to communicate - and why?</li>  
	<li>What makes this verse important?</li>  
	<li>What insights does this verse give you?</li>  
	<li>How does it make you feel?</li>
</ul>
<p>Try emphasizing individual words in a verse: </p>
<ul>
	<li>What meaning does each key word contribute to the verse?  </li>
	<li>Are there other words that mean the same thing - but give you clearer insight into what the verse is really saying?</li>  
</ul>
<p>Draw connections between this verse and other verses you know, or have read before.</p>
<ul>
	<li>What light do they shed on each other?</li>
	<li>(The more verses you know, the more exciting these connections will become!)</li>
</ul>
</div>

<div id='tReminderApply'>
<div class='alignleft'><input value="Back" onclick="context.pop(); refreshPage(); " type="button"></div>
<div class='alignright'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
<h1 style="clear: top; text-align:center;" id="myh1">Questions for Application</h1>
<p>Suggestions for experiencing a verse through application:</p>
<ul>
	<li><b>Goals.</b>  Does this verse have any bearing on your goals?  Your direction in life?  The things you are working toward?  Perhaps it will suggest ways to move forward toward a goal, or it may suggest altering, or even eliminating a goal.</li>
	<li><b>Decisions.</b>  All of us face challenging decisions at times.  Does this verse shed light on any decisions you are facing?  Does it point to some choice you should make?</li>  
	<li><b>Lifestyle.</b>  Think through your daily schedule.  Your habits, patterns, and routines.  Can you think of ways to change your lifestyle - that would bring it more into harmony with the verse you are memorizing?</li>  
	<li><b>Problems.</b>  Are you experiencing any difficulties or irritations?  Perhaps the verse will suggest solutions.  Look for answers to the perplexing problems of your life.</li>  
</ul>
<p>Ask God to impress you with at least <b>one project</b> for <b>every verse you memorize</b> - something small you can do to help build that verse into your life.  Try to make sure that these projects are clearly connected to the verse you are memorizing, that they are specific, and that they are small enough to be carried out that day or soon thereafter.</p>
</div>


</div>

</body></html>
