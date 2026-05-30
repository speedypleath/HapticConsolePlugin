cmake_minimum_required(VERSION 3.22)
project(HapticConsolePlugin VERSION 1.0.0)

add_subdirectory(JUCE)

juce_add_plugin(HapticConsolePlugin
    PLUGIN_MANUFACTURER_CODE HpCo
    PLUGIN_CODE HpC1
    FORMATS VST3 AU
    PRODUCT_NAME "Haptic Console"
    IS_MIDI_EFFECT TRUE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
)

target_sources(HapticConsolePlugin PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/MidiMapper.cpp
)

target_include_directories(HapticConsolePlugin PRIVATE Source)

target_compile_definitions(HapticConsolePlugin PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(HapticConsolePlugin PRIVATE
    juce::juce_audio_processors
    juce::juce_audio_plugin_client
    juce::juce_gui_extra
    juce::juce_core
    juce::juce_data_structures
    juce::juce_events
    juce::juce_graphics
    juce::juce_gui_basics
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags
)
