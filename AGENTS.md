# Repository Agent Notes

## Mobile Forms And Keyboard

- Every mobile screen or modal containing a `TextInput` must account for the
  software keyboard with a `KeyboardAvoidingView` and scrollable form content.
- Test forms on both iOS and Android with the keyboard open and the final input
  focused. The focused field, validation feedback, and primary submit action
  must remain visible or be reachable by scrolling.
- Bottom-sheet forms and forms containing wheel-style pickers must have a
  bounded height. Do not let fixed picker content prevent the form from
  shrinking or scrolling when the keyboard opens.
- Set `keyboardShouldPersistTaps` on scrollable forms and explicitly scroll the
  focused lower field into view when automatic keyboard avoidance is not
  sufficient.
- Do not combine `KeyboardAvoidingView` with automatic keyboard insets unless
  the result has been verified on a real device; duplicated insets can push a
  bottom sheet too high and leave a large empty area above the keyboard.
- Android is configured with `softwareKeyboardLayoutMode: "resize"`. Prefer
  letting the Activity resize and keeping the form scrollable; do not also use
  `KeyboardAvoidingView` with `behavior="height"` unless the combination has
  been verified on an Android device, because it can shrink the form twice.
- Android verification must include Gboard open on the final field, both
  gesture and three-button navigation modes, and confirming that the focused
  input and primary action remain reachable.
- Do not use native wheel pickers for ordinary option selection. Use the shared
  `MobileSelect` trigger and scrollable option sheet so iOS and Android present
  the same predictable select interaction. Reserve wheel pickers for values
  where spinning is the established interaction, such as time or duration.
- Set an explicit, readable `placeholderTextColor` that is consistent with
  other inspection forms instead of relying on the low-contrast platform
  default.
