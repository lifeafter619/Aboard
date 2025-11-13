# Timer Module Sound Files

The timer feature includes sound notification support for countdown completion.

## Preset Sounds

The following preset sounds are referenced in the timer:
- `class-bell.mp3` - School class bell sound
- `exam-end.mp3` - Exam end notification sound  
- `gentle-alarm.mp3` - Gentle reminder alarm
- `digital-beep.mp3` - Digital beep sound

## Sound File Location

Place audio files in `/sounds/` directory:
```
/sounds/
  ├── class-bell.mp3
  ├── exam-end.mp3
  ├── gentle-alarm.mp3
  └── digital-beep.mp3
```

## Fallback Behavior

If sound files are not available, the timer will automatically use a Web Audio API generated beep sound as a fallback. This ensures the timer works even without the sound files.

## Custom Sounds

Users can also upload their own custom sound files through the timer settings interface. Supported formats include MP3, WAV, OGG, and other browser-supported audio formats.

## Implementation Note

The sound files are optional. The timer feature is fully functional without them, using the built-in Web Audio API fallback for sound notifications.
