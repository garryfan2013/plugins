'use strict';

// external requires
var assert = require('chai').assert;
var restify = require('restify');
var restifyClients = require('restify-clients');

// local files
var helper = require('./lib/helper');
var plugins = require('../lib');

// local globals
var SERVER;
var CLIENT;
var PORT;

describe('accept parser', function () {

    before(function (done) {
        SERVER = restify.createServer({
            dtrace: helper.dtrace,
            log: helper.getLog('server')
        });

        SERVER.use(plugins.pre.context());

        SERVER.get('/', function respond(req, res, next) {
            res.send();
            next();
        });

        SERVER.listen(0, '127.0.0.1', function () {
            PORT = SERVER.address().port;
            CLIENT = restifyClients.createJsonClient({
                url: 'http://127.0.0.1:' + PORT,
                dtrace: helper.dtrace,
                retry: false
            });

            done();
        });
    });

    after(function (done) {
        CLIENT.close();
        SERVER.close(done);
    });


    it('should use context', function (done) {

        SERVER.get('/', [
            function one(req, res, next) {
                req.set('foo', {
                    a: 1
                });
                return next();
            },
            function two(req, res, next) {
                assert.deepEqual(req.get('foo'), {
                    a: 1
                });
                req.get('foo').b = 2;
                req.set('bar', [1]);
                return next();
            },
            function three(req, res, next) {
                assert.deepEqual(req.get('foo'), {
                    a: 1,
                    b: 2
                });
                assert.deepEqual(req.get('bar'), [1]);
                res.send();
                return next();
            }
        ]);

        CLIENT.get('/', function (err, _, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            return done();
        });
    });


    it('should not share context', function (done) {

        SERVER.get('/', function one(req, res, next) {
            // ensure we don't get context from previous request
            assert.equal(req.get('foo', null));
            return next();
        });

        CLIENT.get('/', function (err, _, res) {
            assert.ifError(err);
            assert.equal(res.statusCode, 200);
            return done();
        });
    });
});
