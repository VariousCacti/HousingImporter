export default {
    action_name: "Change Player Stat",
    stat: {
        slot: 10,
        default_value: "Kills",
        type: "chat_input"
    },
    mode: {
        slot: 11,
        default_value: "INCREMENT",
        type: "static_option_select",
        options: [
            "Increment",
            "Decrement",
            "Set",
            "Multiply",
            "Divide"
        ]
    },
    amount: {
        slot: 12,
        default_value: 1,
        type: "anvil_input"
    }
}