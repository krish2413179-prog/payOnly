import 'package:flutter/material.dart';

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool danger;
  final bool secondary;

  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.danger = false,
    this.secondary = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg = Colors.white;

    if (danger) {
      bg = const Color(0xFFEF4444);
    } else if (secondary) {
      bg = const Color(0xFF111827);
      fg = Colors.white70;
    } else {
      bg = const Color(0xFF8B5CF6);
    }

    return Expanded(
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: fg,
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        child: Text(label, textAlign: TextAlign.center),
      ),
    );
  }
}
