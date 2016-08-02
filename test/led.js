require("./common/bootstrap");

var protoProperties = [{
  name: "on"
}, {
  name: "off"
}, {
  name: "toggle"
}, {
  name: "brightness"
}, {
  name: "pulse"
}, {
  name: "fade"
}, {
  name: "fadeIn"
}, {
  name: "fadeOut"
}, {
  name: "strobe"
}, {
  name: "blink"
}, {
  name: "stop"
}];

var instanceProperties = [{
  name: "id"
}, {
  name: "pin"
}, {
  name: "value"
}];

function testLedShape(test) {
  test.expect(protoProperties.length + instanceProperties.length);

  protoProperties.forEach(function(method) {
    test.equal(typeof this.led[method.name], "function");
  }, this);

  instanceProperties.forEach(function(property) {
    test.notEqual(typeof this.led[property.name], "undefined");
  }, this);

  test.done();
}

exports["Led - Digital"] = {
  setUp: function(done) {
    this.board = newBoard();
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.digitalWrite = this.sandbox.spy(MockFirmata.prototype, "digitalWrite");
    this.pinMode = this.sandbox.spy(MockFirmata.prototype, "pinMode");
    this.enqueue = this.sandbox.stub(Animation.prototype, "enqueue");

    this.led = new Led({
      pin: 13,
      board: this.board
    });

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  shape: testLedShape,

  instanceof: function(test) {
    test.expect(1);
    test.ok(Led.call({}) instanceof Led);
    test.done();
  },

  pinMode: function(test) {
    test.expect(2);
    test.ok(this.pinMode.firstCall.calledWith(13, this.board.io.MODES.OUTPUT));
    test.equal(this.pinMode.callCount, 1);
    test.done();
  },

  defaultMode: function(test) {
    test.expect(1);
    test.equal(this.led.mode, this.board.io.MODES.OUTPUT);
    test.done();
  },

  on: function(test) {
    test.expect(2);

    this.led.on();
    test.ok(this.digitalWrite.firstCall.calledWith(13, 1));
    test.equal(this.digitalWrite.callCount, 1);

    test.done();
  },

  off: function(test) {
    test.expect(2);

    this.led.off();
    test.ok(this.digitalWrite.firstCall.calledWith(13, 0));
    test.equal(this.digitalWrite.callCount, 1);

    test.done();
  },

  isOn: function(test) {
    // https://github.com/rwaldron/johnny-five/issues/351
    test.expect(6);

    // Start in "off" state
    this.led.off();
    this.led.strobe(5);
    this.clock.tick(6);
    this.led.stop();

    // After one cycle, the led is on,
    // but stopped so not running
    // and the value left behind is 1
    test.equal(this.led.isOn, true);
    test.equal(this.led.isRunning, false);
    test.equal(this.led.value, 1);

    // Now it will start out ON
    this.led.strobe(5);
    this.clock.tick(6);

    // After one cycle, the led is off,
    // but NOT stopped so still running
    // and the value left behind is 0
    test.equal(this.led.isOn, false);
    test.equal(this.led.isRunning, true);
    test.equal(this.led.value, 0);

    test.done();
  },

  toggle: function(test) {
    test.expect(5);

    this.led.off();
    this.digitalWrite.reset();

    this.led.toggle();
    test.ok(this.digitalWrite.lastCall.calledWith(13, 1));
    test.ok(this.led.isOn);

    this.led.toggle();
    test.ok(this.digitalWrite.lastCall.calledWith(13, 0));
    test.ok(!this.led.isOn);

    test.equal(this.digitalWrite.callCount, 2);

    test.done();
  },

  strobe: function(test) {
    test.expect(7);

    var spy;

    this.led.off();
    this.digitalWrite.reset();
    this.led.strobe(100);

    this.clock.tick(100);
    test.ok(this.digitalWrite.lastCall.calledWith(13, 1));
    this.clock.tick(100);
    test.ok(this.digitalWrite.lastCall.calledWith(13, 0));
    this.led.stop();
    this.clock.tick(100);
    test.equal(this.digitalWrite.callCount, 2);

    this.led.stop().off();
    spy = this.sandbox.spy();
    this.led.strobe(100, spy);

    this.clock.tick(100);
    test.equal(spy.callCount, 1);
    this.clock.tick(100);
    test.equal(spy.callCount, 2);

    this.led.stop().off();
    spy = this.sandbox.spy();
    this.led.strobe(spy);

    this.clock.tick(100);
    test.equal(spy.callCount, 1);
    this.clock.tick(100);
    test.equal(spy.callCount, 2);

    test.done();
  },

  blink: function(test) {
    test.expect(1);
    test.equal(this.led.blink, this.led.strobe);
    test.done();
  },

  stop: function(test) {
    test.expect(2);

    this.led.strobe();
    test.ok(this.led.isRunning);
    this.led.stop();
    test.ok(!this.led.isRunning);

    test.done();
  },

  animation: function(test) {
    test.expect(1);

    this.led.pulse();
    test.ok(this.led.animation instanceof Animation);
    test.done();
  },

  correctReturns: function(test) {
    test.expect(5);

    test.equal(this.led.blink(), this.led);
    test.equal(this.led.on(), this.led);
    test.equal(this.led.off(), this.led);
    test.equal(this.led.toggle(), this.led);
    test.equal(this.led.stop(), this.led);

    test.done();
  },

  updateInput: function(test) {
    test.expect(1);

    var led2 = new Led({
      pin: 5,
      board: this.board
    });


    this.write = this.sandbox.stub(led2, "write");
    led2.update(100);

    test.equal(this.write.lastCall.args[0], 100);
    test.done();
  },

  updateInputAnode: function(test) {
    test.expect(1);

    var led2 = new Led({
      pin: 5,
      isAnode: true,
      board: this.board
    });

    this.write = this.sandbox.stub(led2, "write");
    led2.update(100);

    test.equal(this.write.lastCall.args[0], 155);
    test.done();
  },

  throws: function(test) {
    test.expect(1);

    var led2 = new Led({
      pin: 13,
      board: this.board
    });


    test.throws(function() {
      led2.update(255);
    });
    test.done();
  },

};

exports["Led - PWM"] = {
  setUp: function(done) {
    this.board = newBoard();
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.analogWrite = this.sandbox.spy(MockFirmata.prototype, "analogWrite");
    this.pinMode = this.sandbox.spy(MockFirmata.prototype, "pinMode");
    this.enqueue = this.sandbox.stub(Animation.prototype, "enqueue");

    this.led = new Led({
      pin: 11,
      board: this.board
    });

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  shape: testLedShape,

  pinMode: function(test) {
    test.expect(2);
    test.ok(this.pinMode.firstCall.calledWith(11, this.board.io.MODES.PWM));
    test.equal(this.pinMode.callCount, 1);
    test.done();
  },

  defaultMode: function(test) {
    test.expect(1);
    test.equal(this.led.mode, this.board.io.MODES.PWM);
    test.done();
  },

  on: function(test) {
    test.expect(2);

    this.led.on();
    test.ok(this.analogWrite.firstCall.calledWith(11, 255));
    test.equal(this.analogWrite.callCount, 1);
    test.done();
  },

  onFromNull: function(test) {
    test.expect(4);

    this.mapget = this.sandbox.spy(Map.prototype, "get");

    this.led = new Led({
      pin: 11,
      board: this.board
    });

    var state = this.mapget.lastCall.returnValue;

    test.equal(state.value, null);

    this.led.on();

    test.equal(state.value, 255);
    test.equal(this.analogWrite.callCount, 1);
    test.ok(this.analogWrite.firstCall.calledWith(11, 255));
    test.done();
  },

  off: function(test) {
    test.expect(2);

    this.led.off();
    test.ok(this.analogWrite.firstCall.calledWith(11, 0));
    test.equal(this.analogWrite.callCount, 1);

    test.done();
  },

  blink: function(test) {
    test.expect(4);
    /*
      This test is incredibly important!

      What this is asserting is that blinking PWM LED will
      analogWrite the correct value of 255 when there is an
      ACTIVE interval and the last value was 0.
    */
    this.mapget = this.sandbox.spy(Map.prototype, "get");

    this.led.off();
    test.equal(this.led.isOn, false);

    this.led.blink(1);

    var state = this.mapget.lastCall.returnValue;

    test.equal(state.value, 0);

    this.clock.tick(1);
    test.equal(this.led.isOn, true);
    test.equal(state.value, 255);

    test.done();
  },

  toggle: function(test) {
    test.expect(5);

    this.led.off();
    this.analogWrite.reset();

    this.led.toggle();
    test.ok(this.analogWrite.lastCall.calledWith(11, 255));
    test.ok(this.led.isOn);

    this.led.toggle();
    test.ok(this.analogWrite.lastCall.calledWith(11, 0));
    test.ok(!this.led.isOn);

    test.equal(this.analogWrite.callCount, 2);

    test.done();
  },

  brightness: function(test) {
    test.expect(4);

    this.led.off();
    this.analogWrite.reset();

    this.led.brightness(255);
    test.ok(this.analogWrite.lastCall.calledWith(11, 255));

    this.led.brightness(100);
    test.ok(this.analogWrite.lastCall.calledWith(11, 100));

    this.led.brightness(0);
    test.ok(this.analogWrite.lastCall.calledWith(11, 0));

    test.equal(this.analogWrite.callCount, 3);

    test.done();
  },

  intensity: function(test) {
    test.expect(101);

    this.brightness = this.sandbox.stub(Led.prototype, "brightness");


    for (var i = 0; i <= 100; i++) {
      this.led.intensity(i);
      test.equal(this.brightness.lastCall.args[0], Fn.scale(i, 0, 100, 0, 255));
    }

    test.done();
  },

  pulse: function(test) {
    test.expect(1);

    this.led.pulse();

    test.equal(this.enqueue.callCount, 1);
    test.done();
  },

  pulseDuration: function(test) {
    test.expect(2);

    this.led.pulse(1010);

    test.equal(this.enqueue.callCount, 1);

    var duration = this.enqueue.lastCall.args[0].duration;

    test.equal(duration, 1010);
    test.done();
  },


  pulseCallback: function(test) {
    test.expect(2);

    var spy = this.sandbox.spy();

    this.led.pulse(spy);

    test.equal(this.enqueue.callCount, 1);

    var onloop = this.enqueue.lastCall.args[0].onloop;

    onloop();

    test.equal(spy.callCount, 1);
    test.done();
  },

  pulseDurationCallback: function(test) {
    test.expect(3);

    var spy = this.sandbox.spy();

    this.led.pulse(1010, spy);

    test.equal(this.enqueue.callCount, 1);

    var duration = this.enqueue.lastCall.args[0].duration;
    var onloop = this.enqueue.lastCall.args[0].onloop;

    onloop();


    test.equal(duration, 1010);
    test.equal(spy.callCount, 1);
    test.done();
  },

  pulseObject: function(test) {
    test.expect(1);

    this.led.pulse({});
    test.equal(this.enqueue.callCount, 1);
    test.done();
  },

  "Animation.normalize": function(test) {
    test.expect(1);

    var normalized = this.led[Animation.normalize]([
      null,
      255,
      { value: 0 },
      { value: 1 },
      { intensity: 0 },
      { intensity: 50 },
      { intensity: 100 },
      { brightness: 0 },
      { brightness: 127 },
      { brightness: 255 },
    ]);

    test.deepEqual(normalized, [
      { value: 0, easing: "linear" },
      { value: 255, easing: "linear" },
      { value: 0, easing: "linear" },
      { value: 1, easing: "linear" },
      { value: 0, easing: "linear" },
      { value: 127, easing: "linear" },
      { value: 255, easing: "linear" },
      { value: 0, easing: "linear" },
      { value: 127, easing: "linear" },
      { value: 255, easing: "linear" },
    ]);

    test.done();
  },

  "Animation.render": function(test) {
    test.expect(1);
    this.update = this.sandbox.stub(this.led, "update");
    this.led[Animation.render]([0]);
    test.equal(this.update.callCount, 1);
    test.done();
  },

  correctReturns: function(test) {
    test.expect(10);

    test.equal(this.led.blink(), this.led);
    test.equal(this.led.brightness(), this.led);
    test.equal(this.led.fade(), this.led);
    test.equal(this.led.fadeIn(), this.led);
    test.equal(this.led.fadeOut(), this.led);
    test.equal(this.led.on(), this.led);
    test.equal(this.led.off(), this.led);
    test.equal(this.led.toggle(), this.led);
    test.equal(this.led.pulse(), this.led);
    test.equal(this.led.stop(), this.led);

    test.done();
  },
};

exports["Led - PCA9685 (I2C)"] = {
  setUp: function(done) {
    this.board = newBoard();
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.normalize = this.sandbox.spy(Board.Pins, "normalize");
    this.i2cWrite = this.sandbox.spy(MockFirmata.prototype, "i2cWrite");
    this.pinMode = this.sandbox.spy(MockFirmata.prototype, "pinMode");

    this.led = new Led({
      pin: 0,
      controller: "PCA9685",
      board: this.board
    });

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    Expander.purge();
    done();
  },

  shape: testLedShape,

  defaultFrequency: function(test) {
    test.expect(1);
    test.equal(this.led.frequency, 200);
    test.done();
  },

  // defaultPinNumber: function(test) {
  //   test.expect(1);

  //   this.led = new Led({
  //     controller: "PCA9685",
  //     board: this.board
  //   });

  //   test.equal(this.led.pin, 0);

  //   test.done();
  // },

  customFrequency: function(test) {
    test.expect(1);

    this.led = new Led({
      frequency: 100,
      pin: 0,
      controller: "PCA9685",
      board: this.board
    });

    test.equal(this.led.frequency, 100);
    test.done();
  },

  noNormalization: function(test) {
    test.expect(1);
    test.equal(this.normalize.callCount, 0);
    test.done();
  },

  defaultMode: function(test) {
    test.expect(2);

    var led2 = new Led({
      pin: 5,
      controller: "PCA9685",
      board: this.board
    });

    test.equal(this.led.mode, this.board.io.MODES.PWM);
    test.equal(led2.mode, this.board.io.MODES.PWM);

    test.done();
  },

  pinMode: function(test) {
    test.expect(1);

    // I2C device: no need to call pinMode!
    test.equal(this.pinMode.callCount, 0);

    test.done();
  },

  on: function(test) {
    test.expect(2);

    this.i2cWrite.reset();
    this.led.on();

    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 4096, 16, 0, 0]);
    test.equal(this.i2cWrite.callCount, 1);

    test.done();
  },

  off: function(test) {
    test.expect(2);

    this.i2cWrite.reset();
    this.led.off();
    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 0, 0, 4096, 16]);
    test.equal(this.i2cWrite.callCount, 1);

    test.done();
  },

  toggle: function(test) {
    test.expect(5);

    this.led.off();
    this.i2cWrite.reset();

    this.led.toggle();
    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 4096, 16, 0, 0]);
    test.ok(this.led.isOn);

    this.led.toggle();
    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 0, 0, 4096, 16]);
    test.ok(!this.led.isOn);

    test.equal(this.i2cWrite.callCount, 2);

    test.done();
  },

  brightness: function(test) {
    test.expect(4);

    this.led.off();
    this.i2cWrite.reset();

    this.led.brightness(255);
    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 4096, 16, 0, 0]);

    this.led.brightness(100);
    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 0, 0, 4095 * 100 / 255, 6]);

    this.led.brightness(0);
    test.deepEqual(this.i2cWrite.lastCall.args[1], [6, 0, 0, 4096, 16]);

    test.equal(this.i2cWrite.callCount, 3);

    test.done();
  },

  intensity: function(test) {
    test.expect(102);

    this.brightness = this.sandbox.stub(Led.prototype, "brightness");


    for (var i = 0; i <= 100; i++) {
      this.led.intensity(i);
      test.equal(this.brightness.lastCall.args[0], Fn.scale(i, 0, 100, 0, 255));
    }

    test.equal(this.led.intensity(), 100);

    test.done();
  },

  updateInput: function(test) {
    test.expect(1);

    this.write = this.sandbox.stub(this.led, "write");
    this.led.update(100);

    test.equal(this.write.lastCall.args[0], 100);
    test.done();
  },

  updateInputAnode: function(test) {
    test.expect(1);

    var led2 = new Led({
      pin: 5,
      controller: "PCA9685",
      isAnode: true,
      board: this.board
    });

    this.write = this.sandbox.stub(led2, "write");
    led2.update(100);

    test.equal(this.write.lastCall.args[0], 155);
    test.done();
  },

  "Animation.normalize": function(test) {
    test.expect(1);

    var normalized = this.led[Animation.normalize]([
      null,
      { value: 0 },
      { value: 1 },
      { intensity: 0 },
      { intensity: 50 },
      { intensity: 100 },
      { brightness: 0 },
      { brightness: 127 },
      { brightness: 255 },
    ]);

    test.deepEqual(normalized, [
      { value: 0, easing: "linear" },
      { value: 0, easing: "linear" },
      { value: 1, easing: "linear" },
      { value: 0, easing: "linear" },
      { value: 127, easing: "linear" },
      { value: 255, easing: "linear" },
      { value: 0, easing: "linear" },
      { value: 127, easing: "linear" },
      { value: 255, easing: "linear" },
    ]);

    test.done();
  },

};

exports["Led - Default Pin w/ Firmata"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  shape: function(test) {
    test.expect(7);

    Board.purge();

    var io = new MockFirmata();
    new Board({
      io: io,
      debug: false,
      repl: false
    });
    io.emit("ready");

    test.equal(new Led().pin, 13);
    test.equal(new Led(0).pin, 0);

    test.equal(new Led("A0").pin, 14);
    test.equal(new Led(14).pin, 14);

    // 13 & 14 are OUTPUT
    test.equal(new Led(13).mode, 1);
    test.equal(new Led(14).mode, 1);

    // 12 is PWM, but the mechanism is stubbed
    this.sandbox.stub(Board.Pins.prototype, "isPwm").returns(true);

    test.equal(new Led(12).mode, 3);

    test.done();
  }
};

exports["Led - Cycling Operations"] = {
  setUp: function(done) {
    this.board = newBoard();
    this.sandbox = sinon.sandbox.create();
    this.stop = this.sandbox.spy(Led.prototype, "stop");
    this.enqueue = this.sandbox.stub(Animation.prototype, "enqueue");

    this.led = new Led({
      pin: 11,
      board: this.board
    });

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  ledCallsStopBeforeNextCyclingOperation: function(test) {
    test.expect(2);

    this.led.blink();
    this.led.fade();
    this.led.pulse();

    test.equal(this.stop.callCount, 3);
    // fade and pulse are animations
    test.equal(this.enqueue.callCount, 2);

    // Ensure that the interval is cleared.
    this.led.stop();
    test.done();
  },
};

exports["Led - Fading"] = {
  setUp: function(done) {
    this.board = newBoard();
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.enqueue = this.sandbox.stub(Animation.prototype, "enqueue");

    this.led = new Led({
      pin: 11,
      board: this.board
    });

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },


  fadeCallback: function(test) {
    test.expect(2);

    var spy = this.sandbox.spy();

    this.led.fade(spy);

    test.equal(this.enqueue.callCount, 1);
    var oncomplete = this.enqueue.lastCall.args[0].oncomplete;

    oncomplete();

    test.equal(spy.callCount, 1);
    test.done();
  },

  fadeValCallback: function(test) {
    test.expect(2);

    var spy = this.sandbox.spy();

    this.led.fade(255, spy);

    test.equal(this.enqueue.callCount, 1);
    var oncomplete = this.enqueue.lastCall.args[0].oncomplete;

    oncomplete();

    test.equal(spy.callCount, 1);
    test.done();
  },

  fadeValDurationCallback: function(test) {
    test.expect(2);

    var spy = this.sandbox.spy();
    this.led.fade(1, 1, spy);

    test.equal(this.enqueue.callCount, 1);

    var oncomplete = this.enqueue.lastCall.args[0].oncomplete;

    oncomplete();

    test.equal(spy.callCount, 1);
    test.done();
  },

  fadeObject: function(test) {
    test.expect(1);

    this.led.fade({});

    test.equal(this.enqueue.callCount, 1);
    test.done();
  },

  fadeValObject: function(test) {
    test.expect(1);

    this.led.fade(255, {});

    test.equal(this.enqueue.callCount, 1);
    test.done();
  },

};


