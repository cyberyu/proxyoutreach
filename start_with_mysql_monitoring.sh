#!/bin/bash

# Enhanced startup script with MySQL monitoring and auto-restart
# This script includes MySQL health monitoring and periodic restarts

set -e

echo "🚀 Starting Proxy Account Outreach with MySQL Health Monitoring..."

# Function to restart MySQL service
restart_mysql() {
    echo "🔄 Restarting MySQL service..."
    
    # Try different restart commands
    if systemctl restart mysql 2>/dev/null; then
        echo "✅ MySQL restarted with systemctl"
        return 0
    elif service mysql restart 2>/dev/null; then
        echo "✅ MySQL restarted with service command"
        return 0
    elif systemctl restart mysqld 2>/dev/null; then
        echo "✅ MySQL restarted with systemctl mysqld"
        return 0
    elif service mysqld restart 2>/dev/null; then
        echo "✅ MySQL restarted with service mysqld"
        return 0
    else
        echo "❌ Failed to restart MySQL service"
        return 1
    fi
}

# Function to check MySQL health
check_mysql_health() {
    mysqladmin ping -h localhost --silent 2>/dev/null
}

# Function to wait for MySQL to be ready
wait_for_mysql() {
    echo "⏳ Waiting for MySQL to be ready..."
    MAX_TRIES=30
    TRIES=0
    
    while ! check_mysql_health; do
        TRIES=$((TRIES + 1))
        if [ $TRIES -gt $MAX_TRIES ]; then
            echo "❌ MySQL failed to start after $MAX_TRIES attempts"
            echo "Checking MySQL error log:"
            tail -20 /var/log/mysql/error.log 2>/dev/null || echo "No MySQL error log found"
            return 1
        fi
        echo "Attempt $TRIES/$MAX_TRIES - waiting for MySQL..."
        sleep 2
    done
    
    echo "✅ MySQL is ready!"
    return 0
}

# Function to setup databases and user
setup_databases() {
    echo "🔧 Setting up databases and users..."
    
    # Create databases
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy;" 2>/dev/null || true
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sds;" 2>/dev/null || true
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sds_calibrated;" 2>/dev/null || true
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sel;" 2>/dev/null || true
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS proxy_sel_calibrated;" 2>/dev/null || true
    
    # Create webapp user
    mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'localhost' IDENTIFIED BY 'webapppass';" 2>/dev/null || true
    mysql -u root -e "CREATE USER IF NOT EXISTS 'webapp'@'%' IDENTIFIED BY 'webapppass';" 2>/dev/null || true
    
    # Grant privileges
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'localhost';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy.* TO 'webapp'@'%';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'localhost';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds.* TO 'webapp'@'%';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'localhost';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sds_calibrated.* TO 'webapp'@'%';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'localhost';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel.* TO 'webapp'@'%';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'localhost';" 2>/dev/null || true
    mysql -u root -e "GRANT ALL PRIVILEGES ON proxy_sel_calibrated.* TO 'webapp'@'%';" 2>/dev/null || true
    mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    
    echo "✅ Database setup completed"
}

# Function to start MySQL health monitoring in background
start_mysql_monitoring() {
    echo "🏥 Starting MySQL health monitoring..."
    
    # Create monitoring script
    cat > /tmp/mysql_monitor.sh << 'EOF'
#!/bin/bash

# MySQL Health Monitoring Script
LOG_FILE="/tmp/mysql_monitor.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_mysql_health() {
    mysqladmin ping -h localhost --silent 2>/dev/null
}

restart_mysql() {
    log_message "🔄 Restarting MySQL service..."
    
    if systemctl restart mysql 2>/dev/null || service mysql restart 2>/dev/null || systemctl restart mysqld 2>/dev/null || service mysqld restart 2>/dev/null; then
        log_message "✅ MySQL restarted successfully"
        sleep 5  # Wait for service to fully start
        return 0
    else
        log_message "❌ Failed to restart MySQL service"
        return 1
    fi
}

log_message "🏥 MySQL health monitoring started"

# Main monitoring loop
while true; do
    if ! check_mysql_health; then
        log_message "❌ MySQL health check failed, attempting restart..."
        if restart_mysql; then
            log_message "✅ MySQL service restored"
        else
            log_message "❌ Failed to restore MySQL service"
        fi
    else
        log_message "✅ MySQL health check passed"
    fi
    
    # Wait 5 minutes before next check
    sleep 300
done
EOF

    chmod +x /tmp/mysql_monitor.sh
    
    # Start monitoring in background
    nohup /tmp/mysql_monitor.sh > /dev/null 2>&1 &
    MONITOR_PID=$!
    echo $MONITOR_PID > /tmp/mysql_monitor.pid
    
    echo "✅ MySQL health monitoring started (PID: $MONITOR_PID)"
}

# Function to start preventive restart scheduler
start_preventive_restarts() {
    echo "⏰ Starting preventive restart scheduler..."
    
    # Create preventive restart script
    cat > /tmp/mysql_preventive.sh << 'EOF'
#!/bin/bash

LOG_FILE="/tmp/mysql_preventive.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

restart_mysql() {
    log_message "🔄 Preventive MySQL restart..."
    
    if systemctl restart mysql 2>/dev/null || service mysql restart 2>/dev/null || systemctl restart mysqld 2>/dev/null || service mysqld restart 2>/dev/null; then
        log_message "✅ Preventive MySQL restart completed"
        return 0
    else
        log_message "❌ Preventive MySQL restart failed"
        return 1
    fi
}

log_message "⏰ Preventive restart scheduler started"

# Wait for initial startup to complete
sleep 1800  # 30 minutes

# Main preventive restart loop (every 4 hours)
while true; do
    log_message "🔄 Running preventive MySQL restart (4-hour schedule)"
    restart_mysql
    
    # Wait 4 hours before next preventive restart
    sleep 14400
done
EOF

    chmod +x /tmp/mysql_preventive.sh
    
    # Start preventive restarts in background
    nohup /tmp/mysql_preventive.sh > /dev/null 2>&1 &
    PREVENTIVE_PID=$!
    echo $PREVENTIVE_PID > /tmp/mysql_preventive.pid
    
    echo "✅ Preventive restart scheduler started (PID: $PREVENTIVE_PID)"
}

# Main startup sequence
echo "📦 Starting MySQL service..."
if ! service mysql start && ! systemctl start mysql && ! systemctl start mysqld && ! service mysqld start; then
    echo "❌ Failed to start MySQL service"
    exit 1
fi

# Wait for MySQL to be ready
if ! wait_for_mysql; then
    echo "❌ MySQL startup failed"
    exit 1
fi

# Setup databases and users
setup_databases

# Start health monitoring
start_mysql_monitoring

# Start preventive restart scheduler
start_preventive_restarts

# Create status check script
cat > /tmp/mysql_status.sh << 'EOF'
#!/bin/bash

echo "🏥 MySQL Health Monitoring Status"
echo "================================"

# Check if monitoring processes are running
if [ -f /tmp/mysql_monitor.pid ] && kill -0 $(cat /tmp/mysql_monitor.pid) 2>/dev/null; then
    echo "✅ Health monitor: Running (PID: $(cat /tmp/mysql_monitor.pid))"
else
    echo "❌ Health monitor: Not running"
fi

if [ -f /tmp/mysql_preventive.pid ] && kill -0 $(cat /tmp/mysql_preventive.pid) 2>/dev/null; then
    echo "✅ Preventive restarts: Running (PID: $(cat /tmp/mysql_preventive.pid))"
else
    echo "❌ Preventive restarts: Not running"
fi

# Show recent logs
echo ""
echo "📋 Recent Health Monitor Log:"
if [ -f /tmp/mysql_monitor.log ]; then
    tail -5 /tmp/mysql_monitor.log
else
    echo "No health monitor log found"
fi

echo ""
echo "📋 Recent Preventive Restart Log:"
if [ -f /tmp/mysql_preventive.log ]; then
    tail -5 /tmp/mysql_preventive.log
else
    echo "No preventive restart log found"
fi

# Check MySQL status
echo ""
echo "🔍 Current MySQL Status:"
if mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo "✅ MySQL is responding"
    mysql -u root -e "SHOW STATUS WHERE Variable_name IN ('Uptime', 'Connections', 'Threads_connected');"
else
    echo "❌ MySQL is not responding"
fi
EOF

chmod +x /tmp/mysql_status.sh

echo ""
echo "🎉 Enhanced MySQL startup completed!"
echo ""
echo "📋 Available monitoring commands:"
echo "   Check status: /tmp/mysql_status.sh"
echo "   Monitor logs: tail -f /tmp/mysql_monitor.log"
echo "   Preventive logs: tail -f /tmp/mysql_preventive.log"
echo ""
echo "🔧 Health monitoring features:"
echo "   ✅ Automatic health checks every 5 minutes"
echo "   ✅ Automatic restart on failure detection"
echo "   ✅ Preventive restarts every 4 hours"
echo "   ✅ Detailed logging of all activities"
echo ""

# Start the main application
# Start the Node.js application
echo "🚀 Starting Node.js application..."
exec node server.js
