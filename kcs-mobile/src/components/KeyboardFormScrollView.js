import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

export default function KeyboardFormScrollView({
  bottomOffset = 24,
  keyboardShouldPersistTaps = "handled",
  ...props
}) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    />
  );
}
