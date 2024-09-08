#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
LOG_FILE="$SCRIPT_DIR/payout_automation.log"

VALIDATOR_SCRIPT_PATH="$SCRIPT_DIR/validator-reward.ts"
NPOOL_SCRIPT_PATH="$SCRIPT_DIR/npool-reward.ts"

run_ts_node() {
    # Redirect all output to /dev/null to suppress messages
    {
        # Source NVM if it's installed
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        # Use Node.js version 16
        nvm use 16 > /dev/null 2>&1 || nvm install 16 > /dev/null 2>&1
    } > /dev/null 2>&1

    # Run ts-node with the provided arguments
    npx ts-node "$@"
}

VALIDATOR_CRON_JOB_CMD="/bin/bash -c 'cd $SCRIPT_DIR && $SCRIPT_DIR/staking-payout.sh run_ts_node validator-reward.ts 2>&1 | grep -v \"^> \" | grep -v \"PORTABLEREGISTRY:\" | grep -v \"Package subpath\" >> $LOG_FILE'"
NPOOL_CRON_JOB_CMD="/bin/bash -c 'cd $SCRIPT_DIR && $SCRIPT_DIR/staking-payout.sh run_ts_node npool-reward.ts 2>&1 | grep -v \"^> \" | grep -v \"PORTABLEREGISTRY:\" | grep -v \"Package subpath\" >> $LOG_FILE'"

log() {
    echo "$(date -Iseconds): $1" | grep -v "^> " | grep -v "PORTABLEREGISTRY:" | tee -a "$LOG_FILE"
}

modify_script() {
    local script_path=$1
    sed -i 's/const userConfirmation = await promptUser("Do you want to claim these rewards? (yes\/no): ");/const userConfirmation = "yes";/' "$script_path"
    sed -i 's/if (userConfirmation\.toLowerCase() === "yes") {/if (true) {/' "$script_path"
    log "Script $(basename "$script_path") modified for automation."
}

revert_script() {
    local script_path=$1
    sed -i 's/const userConfirmation = "yes";/const userConfirmation = await promptUser("Do you want to claim these rewards? (yes\/no): ");/' "$script_path"
    sed -i 's/if (true) {/if (userConfirmation.toLowerCase() === "yes") {/' "$script_path"
    log "Script $(basename "$script_path") reverted to manual confirmation."
}

add_cron_job() {
    local cron_job_cmd=$1
    if crontab -l | grep -qF "$cron_job_cmd"; then
        log "Cron job already exists. Updating with new schedule."
        (crontab -l 2>/dev/null | grep -vF "$cron_job_cmd"; echo "$CRON_JOB_TIME $cron_job_cmd") | crontab -
    else
        (crontab -l 2>/dev/null; echo "$CRON_JOB_TIME $cron_job_cmd") | crontab -
    fi
    if [ $? -eq 0 ]; then
        log "Cron job added/updated successfully."
    else
        log "Error setting up cron job."
    fi
}

remove_cron_job() {
    local cron_job_cmd=$1
    if crontab -l | grep -qF "$cron_job_cmd"; then
        (crontab -l 2>/dev/null | grep -vF "$cron_job_cmd") | crontab -
        if [ $? -eq 0 ]; then
            log "Cron job removed successfully."
        else
            log "Error removing cron job."
        fi
    else
        log "No cron job found to remove."
    fi
}

prompt_for_time() {
    while true; do
        read -p "Enter the time for execution (HH:MM in 24-hour format): " time
        if [[ $time =~ ^([01]?[0-9]|2[0-3]):[0-5][0-9]$ ]]; then
            IFS=':' read -r hour minute <<< "$time"
            CRON_JOB_TIME="$minute $hour"
            break
        else
            echo "Invalid time format. Please use HH:MM in 24-hour format."
        fi
    done
}

prompt_for_schedule() {
    local reward_type=$1
    while true; do
        clear_screen
        echo "Choose a schedule for $reward_type automation:"
        echo "1. Daily"
        echo "2. Twice a week"
        echo "3. Go back to previous menu"
        read -p "Enter your choice (1, 2, or 3): " schedule_choice

        case $schedule_choice in
            1)
                prompt_for_time
                CRON_JOB_TIME="$CRON_JOB_TIME * * *"
                return 0
                ;;
            2)
                if ! prompt_for_days; then
                    continue
                fi
                prompt_for_time
                CRON_JOB_TIME="$CRON_JOB_TIME * * $days"
                return 0
                ;;
            3)
                return 1
                ;;
            *)
                echo "Invalid choice. Please try again."
                read -p "Press Enter to continue..."
                ;;
        esac
    done
}

prompt_for_days() {
    while true; do
        clear_screen
        echo "Choose days for twice a week automation:"
        echo "1. Monday and Thursday"
        echo "2. Tuesday and Friday"
        echo "3. Wednesday and Saturday"
        echo "4. Go back to schedule selection"
        read -p "Enter your choice (1, 2, 3, or 4): " days_choice

        case $days_choice in
            1) days="1,4"; return 0 ;;
            2) days="2,5"; return 0 ;;
            3) days="3,6"; return 0 ;;
            4) return 1 ;;
            *) 
                echo "Invalid choice. Please try again."
                read -p "Press Enter to continue..."
                ;;
        esac
    done
}

start_automation() {
    local script_path=$1
    local cron_job_cmd=$2
    local reward_type=$3
    
    if ! prompt_for_schedule "$reward_type"; then
        echo "Automation setup cancelled."
        return
    fi
    
    clear_screen
    echo "Setting up automation for $reward_type..."
    modify_script "$script_path"
    add_cron_job "$cron_job_cmd"
    echo "Automation started for $reward_type."
    echo
    check_current_automation "$cron_job_cmd"
}

remove_automation() {
    local script_path=$1
    local cron_job_cmd=$2
    revert_script "$script_path"
    remove_cron_job "$cron_job_cmd"
    log "Automation removed for $(basename "$script_path"). The script will now require manual confirmation."
}

check_current_automation() {
    local cron_job_cmd=$1
    current_cron=$(crontab -l 2>/dev/null | grep -F "$cron_job_cmd")
    if [ -n "$current_cron" ]; then
        current_schedule=$(echo "$current_cron" | awk '{print $1, $2, $3, $4, $5}')
        if [[ "$current_schedule" =~ ^([0-9]+)\ ([0-9]+)\ \*\ \*\ \* ]]; then
            echo "Current automation is scheduled for Daily at ${BASH_REMATCH[2]}:${BASH_REMATCH[1]}"
        elif [[ "$current_schedule" =~ ^([0-9]+)\ ([0-9]+)\ \*\ \*\ ([1-7],?[1-7]?) ]]; then
            days_human=""
            case "${BASH_REMATCH[3]}" in
                "1,4") days_human="Monday and Thursday" ;;
                "2,5") days_human="Tuesday and Friday" ;;
                "3,6") days_human="Wednesday and Saturday" ;;
            esac
            echo "Current automation is scheduled for Twice a week: $days_human at ${BASH_REMATCH[2]}:${BASH_REMATCH[1]}"
        else
            echo "Current automation has a custom schedule: $current_schedule"
        fi
        return 0
    else
        echo "No current automation found."
        return 1
    fi
}

automation_submenu() {
    local script_path=$1
    local cron_job_cmd=$2
    local reward_type=$3

    clear_screen
    echo "Checking current automation status for $reward_type..."
    local automation_exists=false
    if check_current_automation "$cron_job_cmd"; then
        automation_exists=true
    fi
    echo

    while true; do
        echo "Options for $reward_type:"
        echo "1. Start Automation"
        echo "2. Remove Automation"
        echo "3. Go back to main menu"
        read -p "Enter your choice (1, 2, or 3): " subchoice
        case $subchoice in
            1)
                if [ "$automation_exists" = true ]; then
                    read -p "An existing automation was found. Do you still want to proceed? (y/n): " proceed
                    if [[ $proceed != "y" && $proceed != "Y" ]]; then
                        echo "Keeping existing automation."
                        read -p "Press Enter to continue..."
                        clear_screen
                        continue
                    fi
                fi
                start_automation "$script_path" "$cron_job_cmd" "$reward_type"
                read -p "Press Enter to continue..."
                return
                ;;
            2)
                if [ "$automation_exists" = true ]; then
                    remove_automation "$script_path" "$cron_job_cmd"
                else
                    echo "No automation found to remove."
                fi
                read -p "Press Enter to continue..."
                return
                ;;
            3)
                return
                ;;
            *)
                echo "Invalid option. Please try again."
                read -p "Press Enter to continue..."
                clear_screen
                ;;
        esac
    done
}

clear_screen() {
    clear
    echo "Avail Stake Flow - Automation Setup"
    echo "===================================="
    echo
}

prompt_user() {
    while true; do
        clear_screen
        echo "Main Menu:"
        echo "1. Validator Rewards"
        echo "2. Nomination Pools"
        echo "3. Exit"
        read -p "Enter your choice (1, 2, or 3): " choice
        case $choice in
            1)
                automation_submenu "$VALIDATOR_SCRIPT_PATH" "$VALIDATOR_CRON_JOB_CMD" "Validator Rewards"
                ;;
            2)
                automation_submenu "$NPOOL_SCRIPT_PATH" "$NPOOL_CRON_JOB_CMD" "Nomination Pools"
                ;;
            3)
                echo "Exiting without changes."
                exit 0
                ;;
            *)
                echo "Invalid option. Please try again."
                read -p "Press Enter to continue..."
                ;;
        esac
    done
}

# Add this at the end of the script
if [ "$1" = "run_ts_node" ]; then
    shift
    run_ts_node "$@"
    exit 0
fi

# Start the control script
prompt_user
