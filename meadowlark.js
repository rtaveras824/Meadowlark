// picks random fortune
var fortune = require('./lib/fortune.js');
var credentials = require('./credentials.js');

var express = require('express');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var jqupload = require('jquery-file-upload-middleware');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var nodemailer = require('nodemailer');

var app = express();

var mailTransport = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: credentials.gmail.user,
		pass: credentials.gmail.password
	}
});

mailTransport.sendMail({
	from: '"Reuben" <sturmknightoftherose@gmail.com>',
	to: 'rtaveras824@hotmail.com',
	subject: 'Your Meadowlark Travel Tour',
	text: 'Thank you for booking your trip with Meadowlark Travel.'
}, function(err) {
	if(err) console.error('Unaable to send email: ' + err);
});

//set up handlebars view engine
var handlebars = require('express-handlebars').create({ 
	defaultLayout: 'main',
	helpers: {
		section: function(name, options) {
			if(!this._sections) this._sections = {};
			this._sections[name] = options.fn(this);
			return null;
		}
	} 
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser(credentials.cookieSecret));

app.use(expressSession({
	resave: false,
	saveUninitialized: false,
	secret: credentials.cookieSecret,
}));

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
	//if there's a flash message, transfer it to the context, then clear it
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});

app.use('/upload', function(req, res, next) {
	var now = Date.now();
	jqupload.fileHandler({
		uploadDir: function() {
			return __dirname + '/public/uploads/' + now;
		},
		uploadUrl: function() {
			return '/uploads/' + now;
		}
	})(req, res, next);
});

app.use(function(req, res, next) {
	res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
	next();
});

function getWeatherData() {
	return {
		locations: [
			{
				name: 'Portland',
				forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
				weather: 'Overcast',
				temp: '54.1 F (12.3 C)'
			}
		]
	};
}

app.use(function(req, res, next) {
	if (!res.locals.partials) res.locals.partials = {};
	res.locals.partials.weatherContext = getWeatherData();
	next();
});

app.get('/', function(req, res) {
	res.render('home');
});

app.get('/about', function(req, res) {
	res.render('about', { 
		fortune: fortune.getFortune(),
		pageTestScript: '/qa/tests-about.js'
	 });
});

app.get('/jquery-test', function(req, res) {
	res.render('jquery-test');
});

app.get('/nursery-rhyme', function(req, res) {
	res.render('nursery-rhyme');
});

app.get('/data/nursery-rhyme', function(req, res) {
	res.json({
		animal: 'squirrel',
		bodyPart: 'tail',
		adjective: 'bushy',
		noun: 'heck'
	});
});

app.get('/tours/hood-river', function(req, res) {
	res.render('tours/hood-river');
});

app.get('/tours/request-group-rate', function(req, res) {
	res.render('tours/request-group-rate');
});

app.get('/newsletter', function(req, res) {
	// we will learn about CSRF later... for now, we just
	// provide a dummy value
	res.render('newsletter', { csrf: 'CSRF token goes here' });
});

app.post('/process', function(req, res) {
	// console.log('Form (from querystring): ' + req.query.form);
	// console.log('CSRF token (from hidden form field): ' + req.body._csrf);
	// console.log('Name (from visible form field): ' + req.body.name);
	// console.log('Email (from visible form field): ' + req.body.email);
	// // Don't use 301 redirects, that is a permanent redirect and will cache the destination
	// res.redirect(303, '/thank-you');

	if(req.xhr || req.accepts('json,html') === 'json') {
		// if there were an error, we would send { error: 'error description' }
		res.send({ success: true });
	} else {
		// if there were an error, we would redirect to an error page
		res.redirect(303, '/thank-you');
	}
});

app.get('/thank-you', function(req,res) {
	res.render('thank-you');
});

app.get('/contest/vacation-photo', function(req, res) {
	var now = new Date();
	res.render('contest/vacation-photo', {
		year: now.getFullYear(),
		month: now.getMonth()
	});
});

app.post('/contest/vacation-photo/:year/:month', function(req, res) {
	var form = new formidable.IncomingForm();
	form.parse(req, function(err, fields, files) {
		if (err) return res.redirect(303, '/error');
		console.log('received fields:');
		console.log(fields);
		console.log('received files:');
		console.log(files);
		res.redirect(303, '/thank-you');
	});
});

app.get('/headers', function(req, res) {
	res.set('Content-Type', 'text/plain');
	var s = '';
	for (var name in req.headers) s += name + ': ' + req.headers[name] + '\n';
	res.send(s);
});

//custom 404 page
app.use(function(req, res, next) {
	res.status(404);
	res.render('404');
});

app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function() {
	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});