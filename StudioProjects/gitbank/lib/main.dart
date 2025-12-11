import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/web3_provider.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const GitBanksApp());
}

class GitBanksApp extends StatelessWidget {
  const GitBanksApp({super.key});

  @override
  Widget build(BuildContext context) {
    final baseTheme = ThemeData.dark();

    return ChangeNotifierProvider(
      create: (_) => Web3Provider()..init(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'GitBanks ETTY',
        theme: baseTheme.copyWith(
          scaffoldBackgroundColor: const Color(0xFF050510),
          primaryColor: const Color(0xFF8B5CF6),
          colorScheme: baseTheme.colorScheme.copyWith(
            primary: const Color(0xFF8B5CF6),
            secondary: const Color(0xFF22C55E),
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.transparent,
            elevation: 0,
            centerTitle: true,
            titleTextStyle: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          textTheme: baseTheme.textTheme.apply(
            bodyColor: Colors.white,
            displayColor: Colors.white,
            fontFamily: 'Roboto',
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: const Color(0xFF111827),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            hintStyle: const TextStyle(color: Colors.white54),
            labelStyle: const TextStyle(color: Colors.white70),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
              padding:
              const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              textStyle: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: Color(0xFF020617),
            selectedItemColor: Color(0xFF8B5CF6),
            unselectedItemColor: Colors.white38,
            showUnselectedLabels: true,
            type: BottomNavigationBarType.fixed,
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
